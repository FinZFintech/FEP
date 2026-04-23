import { getCached } from "./cache";

/**
 * Adzuna — live job-market salary data across 16 countries via the public
 * jobs API. Requires a (free) app_id + app_key from developer.adzuna.com;
 * env vars ADZUNA_APP_ID and ADZUNA_APP_KEY. When either is missing the
 * module returns null and the engine falls back to SNAPSHOT / HEURISTIC.
 *
 * Endpoint used: `/v1/api/jobs/{country}/histogram`
 *   Returns { histogram: { "salaryBucket": jobCount, … } } for all jobs
 *   matching the `what=` query. We compute the median by walking cumulative
 *   counts; the total count becomes the "sample size" surfaced on the FIP
 *   confidence band.
 *
 * Supported destinations (Adzuna country code):
 *   US→us, UK→gb, Canada→ca, Australia→au, Germany→de, France→fr,
 *   Netherlands→nl, Singapore→sg, New Zealand→nz, India→in
 *
 * Not supported: Ireland, Sweden, Switzerland(CH)/Austria(AT) are in Adzuna
 * but we don't have them as destinations. Ireland is a destination but
 * Adzuna doesn't cover it — the engine keeps the SNAPSHOT path for IE.
 *
 * TTL: 7 days (active job-listing medians move slowly; refreshing more often
 * would burn quota without improving accuracy).
 */

const ADZUNA_BASE = "https://api.adzuna.com/v1/api/jobs";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export interface AdzunaSalaryData {
  country: string;
  courseQuery: string;
  medianSalary: number;
  currency: string;
  jobCount: number;
  source: string;
  dataKind: "live";
  fetchedAt: string;
}

const COUNTRY_CODES: Readonly<Record<string, string>> = {
  US: "us",
  UK: "gb",
  Canada: "ca",
  Australia: "au",
  Germany: "de",
  France: "fr",
  Netherlands: "nl",
  Singapore: "sg",
  "New Zealand": "nz",
  India: "in",
};

// Mapping each course in our crosswalk to an Adzuna `what=` query. Chosen to
// match the occupation language that appears in job titles rather than
// degree names — "software engineer" pulls far more listings than
// "computer science".
const COURSE_QUERY: Readonly<Record<string, string>> = {
  "Computer Science":        "software engineer",
  "Software Engineering":    "software engineer",
  "Data Science":            "data scientist",
  "Artificial Intelligence": "machine learning engineer",
  "Machine Learning":        "machine learning engineer",
  "Cybersecurity":           "security engineer",
  "Information Systems":     "business analyst",
  "Cloud Computing":         "cloud engineer",
  "Health Informatics":      "health informatics",
  "Electrical Engineering":  "electrical engineer",
  "Mechanical Engineering":  "mechanical engineer",
  "Civil Engineering":       "civil engineer",
  "Chemical Engineering":    "chemical engineer",
  "Biomedical Engineering":  "biomedical engineer",
  "Biotechnology":           "biotechnology scientist",
  "Business Administration": "operations manager",
  "MBA":                     "general manager",
  "Finance":                 "financial analyst",
  "Marketing":               "marketing manager",
  "Supply Chain Management": "supply chain manager",
  "Human Resources":         "human resources",
  "Economics":               "economist",
  "Public Policy":           "policy analyst",
  "Architecture":            "architect",
  "Journalism":              "journalist",
  "Liberal Arts":            "writer",
};

const COUNTRY_CURRENCY: Readonly<Record<string, string>> = {
  US: "USD", UK: "GBP", Canada: "CAD", Australia: "AUD",
  Germany: "EUR", France: "EUR", Netherlands: "EUR",
  Singapore: "SGD", "New Zealand": "NZD", India: "INR",
};

function medianFromHistogram(h: Record<string, number>): { median: number; count: number } | null {
  const entries = Object.entries(h)
    .map(([bucket, count]) => ({ salary: parseInt(bucket, 10), count }))
    .filter((e) => Number.isFinite(e.salary) && e.count >= 0)
    .sort((a, b) => a.salary - b.salary);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, e) => s + e.count, 0);
  if (total === 0) return null;
  let cumulative = 0;
  for (const e of entries) {
    cumulative += e.count;
    if (cumulative >= total / 2) {
      return { median: e.salary, count: total };
    }
  }
  return null;
}

export async function getAdzunaSalary(country: string, course: string): Promise<AdzunaSalaryData | null> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return null;

  const countryCode = COUNTRY_CODES[country];
  const query = COURSE_QUERY[course];
  const currency = COUNTRY_CURRENCY[country];
  if (!countryCode || !query || !currency) return null;

  return getCached(`adzuna:${countryCode}:${course}`, async () => {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query,
      "content-type": "application/json",
    });
    const url = `${ADZUNA_BASE}/${countryCode}/histogram?${params}`;
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { histogram?: Record<string, number> };
    if (!body.histogram) return null;

    const stats = medianFromHistogram(body.histogram);
    // Require a minimum sample size to avoid publishing medians from handfuls
    // of outlier postings. 30 matches the rule of thumb for a stable median.
    if (!stats || stats.count < 30) return null;

    return {
      country,
      courseQuery: query,
      medianSalary: stats.median,
      currency,
      jobCount: stats.count,
      source: `Adzuna — median of ${stats.count.toLocaleString()} active "${query}" job postings in ${country}`,
      dataKind: "live",
      fetchedAt: new Date().toISOString(),
    };
  }, CACHE_TTL);
}

export const ADZUNA_SUPPORTED_COUNTRIES = Object.keys(COUNTRY_CODES);
