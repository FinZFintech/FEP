import { getCached } from "./cache";

/**
 * Nomis (nomisweb.co.uk) — UK Annual Survey of Hours and Earnings (ASHE)
 * by occupation. No API key required for public use.
 *
 * Dataset: NM_30_1 — ASHE Table 14, gross annual pay by occupation (SOC).
 * Geography: K02000001 (United Kingdom).
 * Measures: 20100 = Median, 20300 = 25th percentile, 20400 = 75th percentile.
 * Pay: 1 = Gross Annual Pay (GBP, full-time employees).
 * Sex: 7 = All employees.
 *
 * The `cell` dimension accepts SOC unit-group codes (4-digit integers). From
 * the 2022 ASHE publication onwards, Nomis uses SOC 2020 codes. Our crosswalk
 * `soc2020uk` column feeds this lookup directly.
 *
 * Published annually with ~6-month lag (April reference period, released Oct).
 * TTL: 7 days (annual publication; no need to refresh daily).
 *
 * Returned `dataKind` is "live" on a successful non-null fetch, "heuristic"
 * on fallback. The engine will fall back to country-earnings.ts (SNAPSHOT)
 * when this returns null.
 */

const NOMIS_API = "https://www.nomisweb.co.uk/api/v01/dataset/NM_30_1.data.json";
const UK_GEOGRAPHY = "2092957697"; // K02000001 United Kingdom
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface NomisEarningsData {
  soc2020Code: string;
  medianAnnualPay: number; // GBP, full-time employees
  p25: number;
  p75: number;
  period: string; // "2024" (ASHE reference year)
  source: string;
  dataKind: "live";
  fetchedAt: string;
}

interface NomisObs {
  // Nomis may return either nested objects or dot-notation flat keys
  measures?: { id?: number };
  "measures.id"?: number;
  obs_value?: { value?: number | string };
  "obs_value.value"?: number | string;
  time?: { dsc?: string };
  "time.dsc"?: string;
}

function extractValue(obs: NomisObs): number | null {
  const raw = obs.obs_value?.value ?? obs["obs_value.value"];
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === "string" ? parseFloat(raw.replace(/,/g, "")) : raw;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractMeasureId(obs: NomisObs): number | null {
  const id = obs.measures?.id ?? obs["measures.id"];
  return id !== undefined ? Number(id) : null;
}

function extractPeriod(obs: NomisObs): string {
  return obs.time?.dsc ?? obs["time.dsc"] ?? "";
}

async function fetchNomisAshe(
  socCode: string,
): Promise<{ median: number; p25: number; p75: number; period: string } | null> {
  return getCached(`nomis:ashe:${socCode}`, async () => {
    const params = new URLSearchParams({
      geography: UK_GEOGRAPHY,
      cell: socCode,
      pay: "1",      // Gross Annual Pay
      sex: "7",      // All
      measures: "20100,20300,20400", // Median, P25, P75
      time: "latest",
    });
    const url = `${NOMIS_API}?${params}`;
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const body = await res.json() as { obs?: NomisObs[] };
    if (!body.obs || body.obs.length === 0) return null;

    let median: number | null = null;
    let p25: number | null = null;
    let p75: number | null = null;
    let period = "";

    for (const obs of body.obs) {
      const mId = extractMeasureId(obs);
      const val = extractValue(obs);
      if (!period) period = extractPeriod(obs);
      if (mId === 20100 && val !== null) median = val;
      if (mId === 20300 && val !== null) p25 = val;
      if (mId === 20400 && val !== null) p75 = val;
    }

    if (median === null) return null;
    return {
      median,
      p25: p25 ?? median * 0.78,  // P25 fallback: ~78% of median (ASHE typical ratio)
      p75: p75 ?? median * 1.35,  // P75 fallback: ~135% of median
      period,
    };
  }, CACHE_TTL);
}

/**
 * Fetches ASHE median gross annual pay (GBP) for the given SOC 2020 unit-group
 * code. Returns null when the occupation is not covered or the API is unreachable;
 * callers should fall back to the embedded country-earnings.ts snapshot values.
 */
export async function getNomisEarnings(soc2020Code: string): Promise<NomisEarningsData | null> {
  const data = await fetchNomisAshe(soc2020Code);
  if (!data) return null;

  return {
    soc2020Code,
    medianAnnualPay: data.median,
    p25: data.p25,
    p75: data.p75,
    period: data.period,
    source: `ONS/Nomis ASHE NM_30_1 — Gross Annual Pay, SOC 2020 ${soc2020Code}, UK (${data.period})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}
