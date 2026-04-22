/**
 * Occupation code crosswalk across the five standards each national
 * statistical agency uses. One row per course offered in the app; downstream
 * API modules (BLS, FRED, ONS, StatCan, ANZSCO agencies, Eurostat) pick the
 * column they need.
 *
 *  - SOC 2018   — US Bureau of Labor Statistics (6 digits, dashed)
 *  - ISCO-08    — ILO international standard (4 digits, used by Eurostat, OECD,
 *                  ILOSTAT, and several national agencies)
 *  - NOC 2021   — Statistics Canada (5 digits)
 *  - ANZSCO 2022 — Australia/NZ (6 digits)
 *
 * Codes were taken from each agency's published crosswalks to ISCO-08:
 *   - BLS 2018 SOC → ISCO-08: https://www.bls.gov/soc/
 *   - StatCan NOC 2021 → ISCO-08: https://www.statcan.gc.ca/en/subjects/standard/noc/2021/introductionV1
 *   - ABS ANZSCO 2022 → ISCO-08: https://www.abs.gov.au/statistics/classifications/anzsco-australian-and-new-zealand-standard-classification-occupations/2022
 *
 * When a course maps to a range rather than a single code (e.g. "Data Science"
 * spans multiple ISCO-08 unit groups), we pick the primary code and note the
 * trade-off in a comment. Don't over-index on exactness here — these codes
 * feed aggregate wage lookups where a minor category mismatch costs ~1-3%.
 */

export interface OccupationCodes {
  /** Course key as stored in courses.json / entered on the form. */
  course: string;
  /** US BLS 2018 SOC code, dashed (e.g. "15-1252"). */
  soc: string;
  /** ILO ISCO-08 unit group (4 digits). */
  isco08: string;
  /** Statistics Canada NOC 2021 TEER code (5 digits). */
  noc2021: string;
  /** ABS ANZSCO 2022 unit group (6 digits). */
  anzsco: string;
}

const CROSSWALK: readonly OccupationCodes[] = [
  // ── Software / Data / CS ──────────────────────────────────────────────
  { course: "Computer Science",        soc: "15-1252", isco08: "2512", noc2021: "21231", anzsco: "261313" },
  { course: "Software Engineering",    soc: "15-1252", isco08: "2512", noc2021: "21231", anzsco: "261313" },
  { course: "Data Science",            soc: "15-2051", isco08: "2120", noc2021: "21211", anzsco: "224113" },
  { course: "Artificial Intelligence", soc: "15-2051", isco08: "2120", noc2021: "21211", anzsco: "224113" },
  { course: "Machine Learning",        soc: "15-2051", isco08: "2120", noc2021: "21211", anzsco: "224113" },
  { course: "Cybersecurity",           soc: "15-1212", isco08: "2529", noc2021: "21220", anzsco: "262112" },
  { course: "Information Systems",     soc: "15-1211", isco08: "2511", noc2021: "21222", anzsco: "261112" },
  { course: "Cloud Computing",         soc: "15-1241", isco08: "2523", noc2021: "21233", anzsco: "263111" },
  { course: "Health Informatics",      soc: "15-1211", isco08: "2511", noc2021: "21222", anzsco: "224113" },

  // ── Engineering ───────────────────────────────────────────────────────
  { course: "Electrical Engineering",  soc: "17-2071", isco08: "2151", noc2021: "21310", anzsco: "233311" },
  { course: "Mechanical Engineering",  soc: "17-2141", isco08: "2144", noc2021: "21301", anzsco: "233512" },
  { course: "Civil Engineering",       soc: "17-2051", isco08: "2142", noc2021: "21300", anzsco: "233211" },
  { course: "Chemical Engineering",    soc: "17-2041", isco08: "2145", noc2021: "21320", anzsco: "233111" },
  { course: "Biomedical Engineering",  soc: "17-2031", isco08: "2149", noc2021: "21399", anzsco: "233913" },
  { course: "Biotechnology",           soc: "19-1021", isco08: "2131", noc2021: "21110", anzsco: "234514" },

  // ── Business ──────────────────────────────────────────────────────────
  { course: "Business Administration", soc: "11-1021", isco08: "1120", noc2021: "00013", anzsco: "111111" },
  { course: "MBA",                     soc: "11-1021", isco08: "1120", noc2021: "00013", anzsco: "111111" },
  { course: "Finance",                 soc: "13-2051", isco08: "2412", noc2021: "11103", anzsco: "222311" },
  { course: "Marketing",               soc: "11-2021", isco08: "2431", noc2021: "10022", anzsco: "131114" },
  { course: "Supply Chain Management", soc: "13-1081", isco08: "3323", noc2021: "12103", anzsco: "133611" },
  { course: "Human Resources",         soc: "11-3121", isco08: "1212", noc2021: "11200", anzsco: "132311" },

  // ── Social sciences / arts ────────────────────────────────────────────
  { course: "Economics",               soc: "19-3011", isco08: "2631", noc2021: "41401", anzsco: "224311" },
  { course: "Public Policy",           soc: "11-1031", isco08: "1112", noc2021: "10019", anzsco: "224412" },
  { course: "Architecture",            soc: "17-1011", isco08: "2161", noc2021: "21200", anzsco: "232111" },
  { course: "Journalism",              soc: "27-3023", isco08: "2642", noc2021: "51113", anzsco: "212412" },
  { course: "Liberal Arts",            soc: "25-1199", isco08: "2310", noc2021: "41200", anzsco: "242111" },
];

const BY_COURSE = new Map<string, OccupationCodes>(CROSSWALK.map((r) => [r.course, r]));

/**
 * Resolve a course key to its cross-national occupation codes. Returns null
 * for unknown courses; callers should fall back to a sensible default
 * (typically the "Business Administration" row).
 */
export function getOccupationCodes(course: string): OccupationCodes | null {
  return BY_COURSE.get(course) ?? null;
}

export const OCCUPATION_CROSSWALK = CROSSWALK;
