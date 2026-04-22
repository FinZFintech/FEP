import { getCached } from "./cache";

/**
 * Statistics Canada — Canadian wage growth via the Web Data Service (WDS).
 * No API key required.
 *
 * Table used:
 *  - 14-10-0063-01: Average hourly earnings by type of work, monthly,
 *    seasonally adjusted (Survey of Employment, Payrolls and Hours — SEPH).
 *    Coordinate "1.1.1.1" = Canada / All employees / Total all industries /
 *    Seasonally adjusted.
 *
 * WDS endpoint pattern:
 *   GET /t1/tbl1/en/dtbl/{tableId}/{coordinate}/{nPeriods}
 *
 * This is the Canadian analogue of FRED CES0500000003 and ONS KAB9 and is
 * used to derive Year-3 / Year-5 nominal wage growth CAGR for Canada.
 *
 * Returned `dataKind` is "live" on successful fetch, "heuristic" on fallback.
 */

const STATCAN_WDS = "https://www150.statcan.gc.ca/t1/tbl1/en/dtbl";

// Table 14-10-0063-01 stripped of hyphens → "14100063"
const TABLE_SEPH = "14100063";
// Coordinate: Canada=1, All employees=1, Total all industries=1, Seasonally adjusted=1
const COORD_SEPH = "1.1.1.1";

export interface StatCanGrowthData {
  tableId: string;
  cagr3yr: number;
  cagr5yr: number;
  latestValue: number;
  latestDate: string;
  windowStartDate: string;
  source: string;
  dataKind: "live" | "heuristic";
  fetchedAt: string;
}

interface StatCanPoint {
  refPer: string; // "YYYY-MM-01"
  value: number;
}

interface WdsResponse {
  status: string;
  object?: {
    vectorDataPoint?: Array<{ refPer: string; value: number | string }>;
  } | Array<{
    vectorDataPoint?: Array<{ refPer: string; value: number | string }>;
  }>;
}

function parseWdsPoints(body: WdsResponse): StatCanPoint[] {
  let rawPoints: Array<{ refPer: string; value: number | string }> | undefined;

  if (Array.isArray(body.object)) {
    rawPoints = body.object[0]?.vectorDataPoint;
  } else if (body.object && !Array.isArray(body.object)) {
    rawPoints = body.object.vectorDataPoint;
  }

  if (!rawPoints) return [];

  return rawPoints
    .map((p) => ({ refPer: p.refPer, value: typeof p.value === "string" ? parseFloat(p.value) : p.value }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0)
    .sort((a, b) => a.refPer.localeCompare(b.refPer));
}

function cagrOverN(
  points: StatCanPoint[],
  n: number,
): { rate: number; startDate: string; endDate: string; endValue: number } | null {
  if (points.length <= n) return null;
  const end = points[points.length - 1];
  const start = points[points.length - 1 - n];
  if (!start || start.value <= 0) return null;
  const years = n / 12;
  const rate = Math.pow(end.value / start.value, 1 / years) - 1;
  return { rate, startDate: start.refPer, endDate: end.refPer, endValue: end.value };
}

async function fetchSephData(): Promise<StatCanPoint[] | null> {
  return getCached("statcan:seph", async () => {
    // Fetch last 72 months (6 years) — sufficient for 5-yr CAGR with margin
    const url = `${STATCAN_WDS}/${TABLE_SEPH}/${COORD_SEPH}/72`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const body: WdsResponse = await res.json();
    if (body.status !== "SUCCESS") return null;
    const points = parseWdsPoints(body);
    return points.length > 0 ? points : null;
  }, 86400 * 1000);
}

/**
 * Returns the 3-year and 5-year nominal wage CAGR for Canada, derived from
 * Statistics Canada Table 14-10-0063-01 (SEPH average hourly earnings,
 * all employees, total industries, seasonally adjusted).
 */
export async function getCanadaWageGrowth(): Promise<StatCanGrowthData | null> {
  const points = await fetchSephData();
  if (!points || points.length === 0) return null;

  const y3 = cagrOverN(points, 36);
  const y5 = cagrOverN(points, 60);
  if (!y3 || !y5) return null;

  return {
    tableId: TABLE_SEPH,
    cagr3yr: y3.rate,
    cagr5yr: y5.rate,
    latestValue: y3.endValue,
    latestDate: y3.endDate,
    windowStartDate: y5.startDate,
    source: `StatCan 14-10-0063-01 — Avg Hourly Earnings, All Employees, SA (through ${y3.endDate.slice(0, 7)})`,
    dataKind: "live",
    fetchedAt: new Date().toISOString(),
  };
}
