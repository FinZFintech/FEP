import { getCached } from "./cache";

/**
 * World Bank World Development Indicators (WDI) API — free, no key.
 *
 * Powers the return-to-home scenario for any nationality by replacing the
 * fixed Y3 +20% / Y5 +45% uplift heuristic with live nominal GDP-per-capita
 * growth of the home country. GDP per capita is a well-established proxy
 * for nominal wage growth at the country aggregate level, and the WDI
 * series has deep annual history for every home country we care about.
 *
 * Indicator used:
 *   NY.GDP.PCAP.CD — GDP per capita (current US$)
 *
 * Endpoint pattern (JSON):
 *   https://api.worldbank.org/v2/country/{iso3}/indicator/NY.GDP.PCAP.CD
 *     ?format=json&per_page=10
 *
 * TTL: 30 days (WDI updates annually; daily refresh adds zero signal).
 *
 * Returned `dataKind` is "live" on a successful fetch with ≥ 6 usable
 * observations, "heuristic" on fallback.
 */

const WDI_BASE = "https://api.worldbank.org/v2/country";
const INDICATOR_GDP_PCAP = "NY.GDP.PCAP.CD";
const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

// Nationality → World Bank ISO-3 country code. Covers the set present in
// nationalities.json; add more rows here as we onboard new home countries.
const NATIONALITY_ISO3: Readonly<Record<string, string>> = {
  Indian: "IND",
  Chinese: "CHN",
  Pakistani: "PAK",
  Bangladeshi: "BGD",
  "Sri Lankan": "LKA",
  Nepali: "NPL",
  Nigerian: "NGA",
  Vietnamese: "VNM",
  Indonesian: "IDN",
  Filipino: "PHL",
  Brazilian: "BRA",
  Mexican: "MEX",
  Kenyan: "KEN",
  Egyptian: "EGY",
};

export interface WdiGrowthData {
  iso3: string;
  nationality: string;
  cagr3yr: number;     // 3-yr CAGR of nominal GDP/capita (decimal, 0.04 = 4%)
  cagr5yr: number;
  latestValue: number; // latest GDP/capita, current USD
  latestYear: string;
  source: string;
  dataKind: "live";
  fetchedAt: string;
}

interface WdiObservation {
  date: string;         // year, "2024"
  value: number | null;
}

type WdiResponse = [
  { page: number; pages: number; per_page: number; total: number },
  Array<{ date: string; value: number | null }>,
];

async function fetchSeries(iso3: string): Promise<WdiObservation[] | null> {
  return getCached(`wdi:${iso3}:${INDICATOR_GDP_PCAP}`, async () => {
    const url = `${WDI_BASE}/${encodeURIComponent(iso3)}/indicator/${INDICATOR_GDP_PCAP}?format=json&per_page=10`;
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) return null;
    const body = (await res.json()) as WdiResponse;
    if (!Array.isArray(body) || !Array.isArray(body[1])) return null;
    const obs = body[1]
      .map((r) => ({ date: r.date, value: r.value }))
      .filter((r) => r.value !== null && Number.isFinite(r.value))
      // WDI returns newest first; we want oldest→newest for CAGR windows
      .sort((a, b) => a.date.localeCompare(b.date));
    return obs.length > 0 ? obs : null;
  }, CACHE_TTL);
}

function cagrOverYears(obs: WdiObservation[], years: number): { rate: number; startYear: string; endYear: string; endValue: number } | null {
  if (obs.length <= years) return null;
  const end = obs[obs.length - 1];
  const start = obs[obs.length - 1 - years];
  if (!start || !end || start.value === null || end.value === null || start.value <= 0) return null;
  const rate = Math.pow(end.value / start.value, 1 / years) - 1;
  return { rate, startYear: start.date, endYear: end.date, endValue: end.value };
}

/**
 * Returns 3-year and 5-year nominal GDP-per-capita CAGR for the student's
 * home country. Use as the multiplier source for the Y3/Y5 step-up on the
 * return-to-home salary projection.
 */
export async function getReturnCountryGrowth(nationality: string): Promise<WdiGrowthData | null> {
  const iso3 = NATIONALITY_ISO3[nationality];
  if (!iso3) return null;

  const obs = await fetchSeries(iso3);
  if (!obs || obs.length < 6) return null;

  const y3 = cagrOverYears(obs, 3);
  const y5 = cagrOverYears(obs, 5);
  if (!y3 || !y5) return null;

  return {
    iso3,
    nationality,
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestYear: y3.endYear,
    source: `World Bank WDI NY.GDP.PCAP.CD — ${nationality} GDP/capita, 3-yr CAGR ${(y3.rate * 100).toFixed(2)}% · 5-yr CAGR ${(y5.rate * 100).toFixed(2)}% (through ${y3.endYear})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}

export const WDI_SUPPORTED_NATIONALITIES = Object.keys(NATIONALITY_ISO3);
