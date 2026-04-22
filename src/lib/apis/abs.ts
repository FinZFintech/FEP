import { getCached } from "./cache";

/**
 * Australian Bureau of Statistics — Australian wage growth via the public
 * ABS Data API (SDMX-CSV format). No API key required.
 *
 * Dataset used:
 *  - WPI: Wage Price Index, all sectors, all industries, total hourly
 *    rates of pay including bonuses, seasonally adjusted, quarterly.
 *    Key: 1.1.1.3.2 (Index / All sectors / All industries / Total / SA)
 *    Published quarterly with ~7wk lag; back to 1997.
 *
 * API endpoint (SDMX-CSV):
 *   https://api.data.abs.gov.au/data/WPI/1.1.1.3.2/all?format=csvdata
 *
 * This is the Australian analogue of FRED CES0500000003 and is used to
 * derive Year-3 / Year-5 nominal wage growth CAGR for Australia.
 *
 * Returned `dataKind` is "live" on successful fetch, "heuristic" on fallback.
 */

const ABS_WPI_URL =
  "https://api.data.abs.gov.au/data/WPI/1.1.1.3.2/all?format=csvdata";

export interface AbsGrowthData {
  dataflow: string;
  cagr3yr: number;
  cagr5yr: number;
  latestValue: number;
  latestDate: string;
  windowStartDate: string;
  source: string;
  dataKind: "live" | "heuristic";
  fetchedAt: string;
}

interface AbsPoint {
  period: string;  // "2019-Q1"
  periodKey: number; // yyyyqq for sorting
  value: number;
}

function parseAbsQuarterKey(period: string): number {
  // "2019-Q1" → 201901
  const m = period.match(/^(\d{4})-Q(\d)$/);
  if (!m) return 0;
  return parseInt(m[1], 10) * 10 + parseInt(m[2], 10);
}

function parseCsvData(csv: string): AbsPoint[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const timeIdx = header.indexOf("TIME_PERIOD");
  const valIdx = header.indexOf("OBS_VALUE");
  if (timeIdx === -1 || valIdx === -1) return [];

  const points: AbsPoint[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    const period = (cols[timeIdx] ?? "").trim().replace(/^"|"$/g, "");
    const raw = (cols[valIdx] ?? "").trim().replace(/^"|"$/g, "");
    const value = parseFloat(raw);
    if (!period || !Number.isFinite(value)) continue;
    const periodKey = parseAbsQuarterKey(period);
    if (periodKey === 0) continue;
    points.push({ period, periodKey, value });
  }

  points.sort((a, b) => a.periodKey - b.periodKey);
  return points;
}

function cagrOverQuarters(
  points: AbsPoint[],
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

async function fetchWpiData(): Promise<AbsPoint[] | null> {
  return getCached("abs:wpi", async () => {
    const res = await fetch(ABS_WPI_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const csv = await res.text();
    const points = parseCsvData(csv);
    return points.length > 0 ? points : null;
  }, 86400 * 1000);
}

/**
 * Returns 3-year and 5-year nominal wage CAGR for Australia, derived from
 * the ABS Wage Price Index (all sectors, all industries, total pay, SA).
 * WPI is quarterly; 12Q = 3yr, 20Q = 5yr windows.
 */
export async function getAustraliaWageGrowth(): Promise<AbsGrowthData | null> {
  const points = await fetchWpiData();
  if (!points || points.length === 0) return null;

  const y3 = cagrOverQuarters(points, 12);
  const y5 = cagrOverQuarters(points, 20);
  if (!y3 || !y5) return null;

  return {
    dataflow: "ABS WPI",
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestDate: y3.endPeriod,
    windowStartDate: y5.startPeriod,
    source: `ABS WPI — Wage Price Index, All Industries, SA (through ${y3.endPeriod})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}
