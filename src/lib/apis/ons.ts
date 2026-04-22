import { getCached } from "./cache";

/**
 * ONS (Office for National Statistics) — UK wage growth via the public
 * time-series API. No API key required.
 *
 * Series used:
 *  - KAB9: Average Weekly Earnings, total pay, all employees,
 *    seasonally adjusted, index 2015=100. Published monthly ~5wk lag.
 *    https://api.ons.gov.uk/v1/timeseries/KAB9/data
 *
 * This is the UK analogue of FRED CES0500000003 and is used to derive
 * the Year-3 / Year-5 nominal wage growth CAGR for UK destinations.
 *
 * Returned `dataKind` is "live" on a successful fetch, "heuristic" on fallback.
 */

const ONS_API = "https://api.ons.gov.uk/v1/timeseries";

export interface OnsGrowthData {
  seriesId: string;
  /** Nominal wage growth CAGR as decimal (0.04 = 4%). */
  cagr3yr: number;
  cagr5yr: number;
  latestValue: number;
  latestDate: string;
  windowStartDate: string;
  source: string;
  dataKind: "live" | "heuristic";
  fetchedAt: string;
}

interface OnsMonthPoint {
  sortKey: number; // yyyymm for sorting
  date: string;    // original "YYYY MON" label
  value: number;
}

const MONTH_ABBR: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

function parseOnsDate(date: string): number {
  const parts = date.trim().split(/\s+/);
  if (parts.length !== 2) return 0;
  const year = parseInt(parts[0], 10);
  const month = MONTH_ABBR[parts[1].toUpperCase()] ?? 0;
  return year * 100 + month;
}

function cagrOverMonths(
  points: OnsMonthPoint[],
  months: number,
): { rate: number; startDate: string; endDate: string; endValue: number } | null {
  if (points.length <= months) return null;
  const end = points[points.length - 1];
  const start = points[points.length - 1 - months];
  if (!start || start.value <= 0) return null;
  const rate = Math.pow(end.value / start.value, 12 / months) - 1;
  return { rate, startDate: start.date, endDate: end.date, endValue: end.value };
}

async function fetchOnsSeries(seriesId: string): Promise<OnsMonthPoint[] | null> {
  return getCached(`ons:${seriesId}`, async () => {
    const url = `${ONS_API}/${encodeURIComponent(seriesId)}/data`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const json = await res.json() as { months?: Array<{ date: string; value: string }> };
    const rawMonths = json.months ?? [];
    const points: OnsMonthPoint[] = [];
    for (const m of rawMonths) {
      const v = parseFloat(m.value);
      if (!Number.isFinite(v)) continue;
      const sortKey = parseOnsDate(m.date);
      if (sortKey === 0) continue;
      points.push({ sortKey, date: m.date, value: v });
    }
    points.sort((a, b) => a.sortKey - b.sortKey);
    return points.length > 0 ? points : null;
  }, 86400 * 1000);
}

/**
 * Returns the 3-year and 5-year nominal wage CAGR for UK, derived from
 * ONS KAB9 (Average Weekly Earnings, total pay, all employees, SA).
 * Use this as the UK equivalent of FRED CES0500000003.
 */
export async function getUkWageGrowth(): Promise<OnsGrowthData | null> {
  const SERIES = "KAB9";
  const points = await fetchOnsSeries(SERIES);
  if (!points || points.length === 0) return null;

  const y3 = cagrOverMonths(points, 36);
  const y5 = cagrOverMonths(points, 60);
  if (!y3 || !y5) return null;

  return {
    seriesId: SERIES,
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestDate: y3.endDate,
    windowStartDate: y5.startDate,
    source: `ONS KAB9 — Avg Weekly Earnings, Total Pay, All Employees (through ${y3.endDate})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}
