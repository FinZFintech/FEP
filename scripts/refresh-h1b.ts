/// <reference types="node" />
/**
 * Refresh the embedded H1B LCA snapshot in src/lib/apis/h1b.ts from the
 * DOL OFLC disclosure data.
 *
 * The DOL publishes quarterly LCA CSVs under stable URLs at
 * https://www.dol.gov/agencies/eta/foreign-labor/performance. This script
 * downloads the latest available quarter, aggregates certified petitions by
 * SOC-derived job title, and rewrites h1b.ts with fresh medians, percentiles,
 * sample sizes, and vintage.
 *
 * Usage (manual):
 *   npx tsx scripts/refresh-h1b.ts [--fy 2026 --quarter 1]
 *
 * To cron (example, weekly on Sundays at 03:00 UTC):
 *   0 3 * * 0  cd /app && npx tsx scripts/refresh-h1b.ts >> logs/h1b.log 2>&1
 *
 * This script is intentionally stand-alone (no Next.js / Prisma imports)
 * so it can run in a minimal Node/tsx environment on a build host.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Papa from "papaparse";

// Jobs we care about, mapped to the SOC titles found in LCA_Disclosure CSVs.
// Extend as needed; unknown titles are ignored.
const JOB_TITLE_MATCHERS: Array<{ key: string; matcher: RegExp; topEmployersFallback: string[] }> = [
  { key: "Software Developer", matcher: /software (developer|engineer)/i, topEmployersFallback: ["Google", "Amazon", "Microsoft", "Meta", "Apple"] },
  { key: "Data Scientist", matcher: /data scientist/i, topEmployersFallback: ["Google", "Amazon", "Meta", "Microsoft", "Apple"] },
  { key: "Machine Learning Engineer", matcher: /machine learning/i, topEmployersFallback: ["Google", "Meta", "Amazon", "NVIDIA", "OpenAI"] },
  { key: "Data Analyst", matcher: /data analyst/i, topEmployersFallback: ["Amazon", "JPMorgan", "Deloitte", "Accenture"] },
  { key: "Financial Analyst", matcher: /financial analyst/i, topEmployersFallback: ["Goldman Sachs", "Morgan Stanley", "JPMorgan", "Deloitte"] },
];

interface LcaRow {
  CASE_STATUS?: string;
  JOB_TITLE?: string;
  WAGE_RATE_OF_PAY_FROM?: string;
  WAGE_UNIT_OF_PAY?: string;
  EMPLOYER_NAME?: string;
}

function annualizeWage(amount: number, unit?: string): number | null {
  if (!unit || !Number.isFinite(amount) || amount <= 0) return null;
  switch (unit.toLowerCase()) {
    case "year":
      return amount;
    case "month":
      return amount * 12;
    case "bi-weekly":
      return amount * 26;
    case "week":
      return amount * 52;
    case "hour":
      return amount * 2080;
    default:
      return null;
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return Math.round(sorted[idx]);
}

function topN<T>(items: T[], n: number): T[] {
  const counts = new Map<T, number>();
  for (const it of items) counts.set(it, (counts.get(it) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k);
}

async function downloadCsv(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  return res.text();
}

interface BucketAgg {
  medianSalary: number;
  p25Salary: number;
  p75Salary: number;
  sampleSize: number;
  topEmployers: string[];
}

function aggregate(rows: LcaRow[]): Record<string, BucketAgg> {
  const buckets = new Map<string, { wages: number[]; employers: string[] }>();

  for (const row of rows) {
    if ((row.CASE_STATUS ?? "").toUpperCase() !== "CERTIFIED") continue;
    const title = row.JOB_TITLE ?? "";
    const matcher = JOB_TITLE_MATCHERS.find((m) => m.matcher.test(title));
    if (!matcher) continue;
    const wage = annualizeWage(parseFloat(row.WAGE_RATE_OF_PAY_FROM ?? ""), row.WAGE_UNIT_OF_PAY);
    if (!wage) continue;

    const bucket = buckets.get(matcher.key) ?? { wages: [], employers: [] };
    bucket.wages.push(wage);
    if (row.EMPLOYER_NAME) bucket.employers.push(row.EMPLOYER_NAME);
    buckets.set(matcher.key, bucket);
  }

  const result: Record<string, BucketAgg> = {};
  for (const [key, { wages, employers }] of buckets) {
    const sorted = [...wages].sort((a, b) => a - b);
    result[key] = {
      medianSalary: percentile(sorted, 0.5),
      p25Salary: percentile(sorted, 0.25),
      p75Salary: percentile(sorted, 0.75),
      sampleSize: wages.length,
      topEmployers: topN(employers, 8),
    };
  }
  return result;
}

function renderTs(agg: Record<string, BucketAgg>, vintage: string): string {
  const entries = Object.entries(agg)
    .map(([key, v]) => {
      const employers = v.topEmployers.length
        ? v.topEmployers
        : (JOB_TITLE_MATCHERS.find((m) => m.key === key)?.topEmployersFallback ?? []);
      return `  ${JSON.stringify(key)}: {
    jobTitle: ${JSON.stringify(key)},
    medianSalary: ${v.medianSalary},
    p25Salary: ${v.p25Salary},
    p75Salary: ${v.p75Salary},
    sampleSize: ${v.sampleSize},
    topEmployers: ${JSON.stringify(employers)},
    year: ${JSON.stringify(vintage)},
    source: "DOL OFLC H1B LCA Disclosure Data ${vintage} (auto-refreshed)",
  },`;
    })
    .join("\n");

  return `// AUTO-GENERATED by scripts/refresh-h1b.ts — do not edit by hand.
// Last refresh vintage: ${vintage}
import { getCached as _unused } from "./cache";
void _unused;

export interface H1BSalaryData {
  jobTitle: string;
  medianSalary: number;
  p25Salary: number;
  p75Salary: number;
  sampleSize: number;
  topEmployers: string[];
  year: string;
  source: string;
}

const H1B_SALARY_DATA: Record<string, H1BSalaryData> = {
${entries}
};

export function getH1BSalary(jobTitle: string): H1BSalaryData | null {
  return H1B_SALARY_DATA[jobTitle] ?? null;
}
`;
}

async function main() {
  const args = process.argv.slice(2);
  const fyArg = args.find((a: string) => a.startsWith("--fy="))?.split("=")[1];
  const qArg = args.find((a: string) => a.startsWith("--quarter="))?.split("=")[1];

  const fy = fyArg ?? String(new Date().getFullYear());
  const quarter = qArg ?? "1";
  const vintage = `FY${fy} Q${quarter}`;

  const url =
    process.env.DOL_LCA_URL ??
    `https://www.dol.gov/sites/dolgov/files/ETA/oflc/pdfs/LCA_Disclosure_Data_FY${fy}_Q${quarter}.csv`;

  console.log(`[refresh-h1b] fetching ${url}`);
  const csv = await downloadCsv(url);
  console.log(`[refresh-h1b] parsing ${csv.length} bytes`);

  const rows: LcaRow[] = [];
  Papa.parse<LcaRow>(csv, {
    header: true,
    skipEmptyLines: true,
    step: (r: { data: LcaRow }) => rows.push(r.data),
  });
  console.log(`[refresh-h1b] ${rows.length} rows parsed`);

  const agg = aggregate(rows);
  if (Object.keys(agg).length === 0) {
    throw new Error("No matching job titles found — aborting to avoid clobbering existing snapshot");
  }

  const out = resolve(process.cwd(), "src/lib/apis/h1b.ts");
  await writeFile(out, renderTs(agg, vintage), "utf8");
  console.log(`[refresh-h1b] wrote ${out} with ${Object.keys(agg).length} job titles`);
}

main().catch((err) => {
  console.error("[refresh-h1b] failed:", err);
  process.exit(1);
});
