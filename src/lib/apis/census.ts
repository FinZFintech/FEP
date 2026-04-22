import { getCached } from "./cache";

/**
 * US Census Bureau ACS (American Community Survey) — city wage adjustment
 * for US graduate-degree earners. No API key required for basic queries.
 *
 * Variable: B20004_006E — Median earnings in the past 12 months for
 * population 25+ with a graduate or professional degree (full-time workers).
 * This is the right proxy for our student population: everyone who completes
 * a US master's / PhD holds or will hold a graduate degree.
 *
 * City multiplier = MSA graduate-earner median / US national median.
 * Applied on top of the course-level base salary to capture city wage premiums.
 *
 * Data: ACS 5-year (most stable MSA-level estimates). No API key required.
 * TTL: 7 days (ACS publishes annually; daily refresh adds no value).
 *
 * Supported cities → MSA FIPS codes (2023 metro delineations):
 *   New York (35620), San Francisco (41860), Seattle (42660), Boston (14460),
 *   Los Angeles (31080), Chicago (16980), Austin (12420), Washington DC (47900),
 *   Atlanta (12060), Dallas (19100), Pittsburgh (38300), Denver (19740),
 *   San Jose (41940), Miami (33100), Houston (26420), Minneapolis (33460).
 */

const CENSUS_API = "https://api.census.gov/data/2023/acs/acs5";
const VARIABLE = "B20004_006E"; // Median earnings, graduate/professional degree holders
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const CITY_MSA_FIPS: Readonly<Record<string, string>> = {
  "New York": "35620",
  "San Francisco": "41860",
  "Seattle": "42660",
  "Boston": "14460",
  "Los Angeles": "31080",
  "Chicago": "16980",
  "Austin": "12420",
  "Washington DC": "47900",
  "Atlanta": "12060",
  "Dallas": "19100",
  "Pittsburgh": "38300",
  "Denver": "19740",
  "San Jose": "41940",
  "Miami": "33100",
  "Houston": "26420",
  "Minneapolis": "33460",
};

export interface CensusMultiplierResult {
  city: string;
  msaFips: string;
  cityMedian: number;
  nationalMedian: number;
  multiplier: number;
  source: string;
  dataKind: "live";
  vintage: string;
  fetchedAt: string;
}

type CensusRow = [string, string?, ...string[]];

async function fetchNational(): Promise<number | null> {
  return getCached("census:national:grad", async () => {
    const url = `${CENSUS_API}?get=${VARIABLE}&for=us:1`;
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const rows: CensusRow[] = await res.json();
    // rows[0] = header, rows[1] = [value, geo_id]
    if (rows.length < 2) return null;
    const v = parseInt(rows[1][0], 10);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, CACHE_TTL);
}

async function fetchMsaMedian(fips: string): Promise<number | null> {
  return getCached(`census:msa:${fips}`, async () => {
    const geo = `metropolitan+statistical+area/micropolitan+statistical+area:${fips}`;
    const url = `${CENSUS_API}?get=${VARIABLE}&for=${geo}`;
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const rows: CensusRow[] = await res.json();
    if (rows.length < 2) return null;
    const v = parseInt(rows[1][0], 10);
    return Number.isFinite(v) && v > 0 ? v : null;
  }, CACHE_TTL);
}

/**
 * Returns the live city wage multiplier for a US destination city, derived
 * from Census ACS 5-year median earnings for graduate/professional degree
 * holders (B20004_006E) in the city's MSA vs. the national median.
 *
 * Returns null for unsupported cities (caller should use embedded fallback).
 * Multiplier is clamped to [0.80, 1.70] to prevent extreme outliers.
 */
export async function getCensusGradMultiplier(city: string): Promise<CensusMultiplierResult | null> {
  const fips = CITY_MSA_FIPS[city];
  if (!fips) return null;

  const [cityMedian, nationalMedian] = await Promise.all([
    fetchMsaMedian(fips),
    fetchNational(),
  ]);
  if (!cityMedian || !nationalMedian || nationalMedian === 0) return null;

  const raw = cityMedian / nationalMedian;
  const multiplier = Math.min(1.70, Math.max(0.80, raw));

  return {
    city,
    msaFips: fips,
    cityMedian,
    nationalMedian,
    multiplier,
    source: `US Census ACS 5-yr B20004_006E — Grad-degree earner median, ${city} MSA vs. US (ACS 2023)`,
    dataKind: "live",
    vintage: "2023",
    fetchedAt: new Date().toISOString(),
  };
}

export const CENSUS_SUPPORTED_CITIES = Object.keys(CITY_MSA_FIPS);
