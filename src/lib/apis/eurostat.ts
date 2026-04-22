import { getCached } from "./cache";

/**
 * Eurostat — EU country wage growth via the public SDMX REST API.
 * No API key required.
 *
 * Dataset used:
 *  - lc_lci_r2: Labour Cost Index, quarterly (2016=100). The wage &
 *    salary component (na_item=WAGE) of the total economy (nace_r2=B-S)
 *    is the closest EU-wide analogue of FRED CES0500000003 / ONS KAB9.
 *    Published with ~3-month lag; back to 2012 for most EU countries.
 *
 * API endpoint (JSON-stat 2.0 format, no key required):
 *   https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/lc_lci_r2
 *     ?geo={country_code}&na_item=WAGE&nace_r2=B-S&unit=I
 *     &freq=Q&lastTimePeriod=24&format=JSON
 *
 * Supported destination countries → Eurostat geo codes:
 *   Germany → DE, France → FR, Ireland → IE,
 *   Netherlands → NL, Sweden → SE
 *
 * Returned `dataKind` is "live" on successful fetch, "heuristic" on fallback.
 */

const EUROSTAT_API =
  "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/lc_lci_r2";

const COUNTRY_GEO: Record<string, string> = {
  Germany: "DE",
  France: "FR",
  Ireland: "IE",
  Netherlands: "NL",
  Sweden: "SE",
};

export interface EurostatGrowthData {
  geo: string;
  cagr3yr: number;
  cagr5yr: number;
  latestValue: number;
  latestDate: string;
  windowStartDate: string;
  source: string;
  dataKind: "live" | "heuristic";
  fetchedAt: string;
}

interface JsonStatDataset {
  size?: number[];
  value?: number[] | Record<string, number>;
  dimension?: {
    time?: {
      category?: {
        index?: Record<string, number>;
      };
    };
  };
}

interface EurostatPoint {
  period: string; // "2019Q1"
  periodKey: number; // yyyyqq for sorting, e.g. 201901
  value: number;
}

function parseQuarterKey(period: string): number {
  // "2019Q1" → 201901, "2019Q4" → 201904
  const m = period.match(/^(\d{4})Q(\d)$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 10 + parseInt(m[2], 10);
}

function extractPoints(body: JsonStatDataset): EurostatPoint[] {
  const timeIndex = body.dimension?.time?.category?.index ?? {};
  const size = body.size ?? [];
  const rawValues = body.value;
  if (!rawValues || size.length === 0) return [];

  // Total values = product of all sizes. Time is always the last dimension.
  // Since we query a single country/frequency/na_item/nace_r2/unit, all other
  // dims have size 1 and each time slot maps to exactly one value index.
  const totalObs = size.reduce((a, b) => a * b, 1);
  const nTime = size[size.length - 1] ?? 0;
  if (nTime === 0) return [];
  const otherDimsProduct = totalObs / nTime; // should be 1 for our query

  const points: EurostatPoint[] = [];
  for (const [period, tIdx] of Object.entries(timeIndex)) {
    const flatIdx = tIdx * otherDimsProduct; // simplified; collapses all other dims
    const v = Array.isArray(rawValues)
      ? (rawValues[flatIdx] ?? null)
      : ((rawValues as Record<string, number>)[String(flatIdx)] ?? null);
    if (v === null || !Number.isFinite(v)) continue;
    const periodKey = parseQuarterKey(period);
    if (periodKey === 0) continue;
    points.push({ period, periodKey, value: v });
  }

  points.sort((a, b) => a.periodKey - b.periodKey);
  return points;
}

function cagrOverQuarters(
  points: EurostatPoint[],
  quarters: number,
): { rate: number; startPeriod: string; endPeriod: string; endValue: number } | null {
  if (points.length <= quarters) return null;
  const end = points[points.length - 1];
  const start = points[points.length - 1 - quarters];
  if (!start || start.value <= 0) return null;
  const years = quarters / 4;
  const rate = Math.pow(end.value / start.value, 1 / years) - 1;
  return { rate, startPeriod: start.period, endPeriod: end.period, endValue: end.value };
}

async function fetchLci(geo: string): Promise<EurostatPoint[] | null> {
  return getCached(`eurostat:lci:${geo}`, async () => {
    const params = new URLSearchParams({
      geo,
      na_item: "WAGE",
      nace_r2: "B-S",
      unit: "I",
      freq: "Q",
      lastTimePeriod: "24",
      format: "JSON",
    });
    const url = `${EUROSTAT_API}?${params}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const body: JsonStatDataset = await res.json();
    const points = extractPoints(body);
    return points.length > 0 ? points : null;
  }, 86400 * 1000);
}

/**
 * Returns 3-year and 5-year nominal wage CAGR for an EU country (Germany,
 * France, Ireland, Netherlands, or Sweden) from the Eurostat Labour Cost
 * Index (lc_lci_r2, wages & salaries component, total economy, quarterly).
 * Returns null for unsupported countries or on fetch failure.
 */
export async function getEuWageGrowth(country: string): Promise<EurostatGrowthData | null> {
  const geo = COUNTRY_GEO[country];
  if (!geo) return null;

  const points = await fetchLci(geo);
  if (!points || points.length === 0) return null;

  // LCI is quarterly; 12Q = 3yr, 20Q = 5yr
  const y3 = cagrOverQuarters(points, 12);
  const y5 = cagrOverQuarters(points, 20);
  if (!y3 || !y5) return null;

  return {
    geo,
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestDate: y3.endPeriod,
    windowStartDate: y5.startPeriod,
    source: `Eurostat lc_lci_r2 — Wages & Salaries Index, ${country} (through ${y3.endPeriod})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}

export const EUROSTAT_SUPPORTED_COUNTRIES = Object.keys(COUNTRY_GEO);
