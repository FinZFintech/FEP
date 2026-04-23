import { getCached } from "./cache";

/**
 * FRED (St. Louis Fed Economic Data).
 *
 * We use the public CSV endpoint (`fredgraph.csv?id=<series>`) rather than
 * the JSON API so we don't need an API key — the CSV URL is open and stable.
 * Series are monthly, seasonally adjusted where relevant, and go back
 * decades; we only care about the most recent 6 years for CAGR windows.
 *
 * Series used:
 *  - CPIAUCSL         — Consumer Price Index, All Urban Consumers (inflation)
 *  - CES0500000003    — Average Hourly Earnings, Total Private (nominal wage level)
 *  - UNRATE           — Unemployment Rate, civilian (headline)
 *
 * Returned `dataKind` is "live" on a successful fetch, "heuristic" on fallback.
 */

const CSV_URL = "https://fred.stlouisfed.org/graph/fredgraph.csv";

export interface FredSeriesPoint {
  date: string; // ISO YYYY-MM-DD
  value: number;
}

export interface FredGrowthData {
  seriesId: string;
  /** Nominal growth CAGR over the given window, as a decimal (0.045 = 4.5%). */
  cagr3yr: number;
  cagr5yr: number;
  latestValue: number;
  latestDate: string;
  windowStartDate: string;
  source: string;
  dataKind: "live" | "heuristic";
  fetchedAt: string;
}

export interface FredLevelData {
  seriesId: string;
  latestValue: number;
  latestDate: string;
  source: string;
  dataKind: "live" | "heuristic";
  fetchedAt: string;
}

function parseCsv(csv: string): FredSeriesPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  // FRED CSV header is "DATE,<SERIES_ID>"; skip the header row.
  const out: FredSeriesPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [date, raw] = lines[i].split(",");
    if (!date || !raw) continue;
    const v = parseFloat(raw);
    // FRED uses "." for missing observations.
    if (!Number.isFinite(v)) continue;
    out.push({ date, value: v });
  }
  return out;
}

async function fetchSeries(seriesId: string): Promise<FredSeriesPoint[] | null> {
  return getCached(`fred:${seriesId}`, async () => {
    const url = `${CSV_URL}?id=${encodeURIComponent(seriesId)}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const csv = await res.text();
    const points = parseCsv(csv);
    return points.length > 0 ? points : null;
  }, 86400 * 1000);
}

/**
 * Compute nominal CAGR of the series over the last `years` years using the
 * two endpoints of the window. Monthly series; we take the latest
 * observation and the observation closest to `years * 12` months earlier.
 */
function cagrOverYears(points: FredSeriesPoint[], years: number): { rate: number; startDate: string; endDate: string; endValue: number } | null {
  if (points.length < years * 12 + 1) return null;
  const end = points[points.length - 1];
  const startIdx = points.length - 1 - years * 12;
  const start = points[startIdx];
  if (!start || start.value <= 0) return null;
  const ratio = end.value / start.value;
  const rate = Math.pow(ratio, 1 / years) - 1;
  return { rate, startDate: start.date, endDate: end.date, endValue: end.value };
}

/**
 * Pulls `CES0500000003` (Total Private average hourly earnings, nominal,
 * monthly) and returns the 3-year and 5-year CAGR. These are the best
 * publicly available proxies for "expected nominal salary growth over 3/5
 * years in the US economy".
 *
 * For non-US destinations, this should not be called; each country needs
 * its own wage-growth source (ONS ASHE for UK, StatCan Table 14-10-0203 for
 * Canada, Eurostat earn_ses for EU, ABS EES for AU).
 */
export async function getUsWageGrowth(): Promise<FredGrowthData | null> {
  const SERIES = "CES0500000003";
  const points = await fetchSeries(SERIES);
  if (!points || points.length === 0) return null;

  const y3 = cagrOverYears(points, 3);
  const y5 = cagrOverYears(points, 5);
  if (!y3 || !y5) return null;

  return {
    seriesId: SERIES,
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestDate: y3.endDate,
    windowStartDate: y5.startDate,
    source: `FRED CES0500000003 — Avg Hourly Earnings, Total Private (through ${y3.endDate})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Pulls CPIAUCSL and returns 3-year and 5-year inflation CAGR. Useful for
 * real-vs-nominal comparisons in the UI; not currently used in FIP, but
 * exposed here so the breakdown can show real purchasing-power bands
 * alongside nominal salary projections.
 */
export async function getUsCpiGrowth(): Promise<FredGrowthData | null> {
  const SERIES = "CPIAUCSL";
  const points = await fetchSeries(SERIES);
  if (!points || points.length === 0) return null;

  const y3 = cagrOverYears(points, 3);
  const y5 = cagrOverYears(points, 5);
  if (!y3 || !y5) return null;

  return {
    seriesId: SERIES,
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestDate: y3.endDate,
    windowStartDate: y5.startDate,
    source: `FRED CPIAUCSL — CPI All Urban Consumers (through ${y3.endDate})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Latest US unemployment rate (headline, civilian). Used as an EP
 * refinement signal — high unemployment → lower employability bonus.
 */
export async function getUsUnemploymentRate(): Promise<FredLevelData | null> {
  const SERIES = "UNRATE";
  const points = await fetchSeries(SERIES);
  if (!points || points.length === 0) return null;
  const last = points[points.length - 1];
  return {
    seriesId: SERIES,
    latestValue: last.value,
    latestDate: last.date,
    source: `FRED UNRATE — US Unemployment Rate (${last.date})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * US labor-market tightness signal, derived from JOLTS Job Openings
 * (JTSJOL) on FRED. We compute a 3-month moving average of the openings
 * level and compare it against the median of the trailing 12 months.
 * Tightness > 1.05 = hot (EP bonus), < 0.90 = cold (EP penalty), else neutral.
 *
 * This tells the engine "is the US labor market warmer or cooler than its
 * own recent normal right now?" without hard-coding an absolute threshold
 * that would drift as the post-COVID reset plays out.
 */
export interface JoltsSignal {
  openings: number;      // latest JTSJOL level (thousands of job openings)
  openingsDate: string;
  tightness: number;     // 3-mo MA / 12-mo median
  band: "hot" | "neutral" | "cold";
  source: string;
  dataKind: "live";
  fetchedAt: string;
}

function movingAverage(points: FredSeriesPoint[], n: number): number | null {
  if (points.length < n) return null;
  const slice = points.slice(-n);
  return slice.reduce((s, p) => s + p.value, 0) / n;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export async function getUsJoltsSignal(): Promise<JoltsSignal | null> {
  const SERIES = "JTSJOL";
  const points = await fetchSeries(SERIES);
  if (!points || points.length < 13) return null;

  const last = points[points.length - 1];
  const threeMonthMA = movingAverage(points, 3);
  const trailing12 = points.slice(-13, -1).map((p) => p.value);
  const baseline = median(trailing12);
  if (!threeMonthMA || !baseline || baseline === 0) return null;

  const tightness = threeMonthMA / baseline;
  const band: JoltsSignal["band"] =
    tightness > 1.05 ? "hot" : tightness < 0.90 ? "cold" : "neutral";

  return {
    openings: last.value,
    openingsDate: last.date,
    tightness,
    band,
    source: `FRED JTSJOL — Job Openings, Total Nonfarm (3-mo MA ÷ 12-mo median, through ${last.date})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}
