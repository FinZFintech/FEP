import { getCached } from "./cache";

const BASE_URL = "https://api.data.gov/ed/collegescorecard/v1";
const API_KEY = process.env.COLLEGE_SCORECARD_API_KEY || "YOUR_API_KEY";

interface ScorecardSchoolResult {
  id: number;
  "school.name": string;
  "school.city": string;
  "school.state": string;
  "latest.earnings.10_yrs_after_entry.median": number | null;
  "latest.earnings.6_yrs_after_entry.median": number | null;
  "latest.earnings.1_yr_after_completion.overall_median_earnings": number | null;
  "latest.admissions.admission_rate.overall": number | null;
  "latest.completion.rate_suppressed.overall": number | null;
  "latest.student.size": number | null;
}

interface ScorecardProgramResult {
  unit_id: number;
  "school.name": string;
  "latest.earnings.1_yr_after_completion.overall_median_earnings": number | null;
  "latest.earnings.4_yrs_after_completion.overall_median_earnings": number | null;
  "latest.cost.avg_net_price.overall": number | null;
}

export interface SchoolEarningsData {
  schoolName: string;
  city: string;
  state: string;
  medianEarnings10yr: number | null;
  medianEarnings6yr: number | null;
  medianEarnings1yr: number | null;
  admissionRate: number | null;
  completionRate: number | null;
  studentSize: number | null;
  source: string;
}

export interface ProgramEarningsData {
  schoolName: string;
  medianEarnings1yr: number | null;
  medianEarnings4yr: number | null;
  avgNetPrice: number | null;
  source: string;
}

const CIP_CODE_MAP: Record<string, string> = {
  "Computer Science": "11",
  "Software Engineering": "11",
  "Data Science": "11.0401",
  "Artificial Intelligence": "11.0401",
  "Machine Learning": "11.0401",
  "Cybersecurity": "11.1003",
  "Information Systems": "11.0401",
  "Cloud Computing": "11.0101",
  "Health Informatics": "51.2706",
  "Electrical Engineering": "14.1001",
  "Mechanical Engineering": "14.1901",
  "Civil Engineering": "14.0801",
  "Chemical Engineering": "14.0701",
  "Biomedical Engineering": "14.0501",
  "Biotechnology": "26.1201",
  "Business Administration": "52.0201",
  "MBA": "52.0201",
  "Finance": "52.0801",
  "Marketing": "52.1401",
  "Supply Chain Management": "52.0203",
  "Human Resources": "52.1001",
  "Economics": "45.0601",
  "Public Policy": "44.0501",
  "Architecture": "04.0201",
  "Journalism": "09.0401",
  "Liberal Arts": "24.0101",
};

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getSchoolEarnings(universityName: string): Promise<SchoolEarningsData | null> {
  const cacheKey = `scorecard:school:${normalize(universityName)}`;

  return getCached(cacheKey, async () => {
    const searchName = normalize(universityName);
    const fields = [
      "id",
      "school.name",
      "school.city",
      "school.state",
      "latest.earnings.10_yrs_after_entry.median",
      "latest.earnings.6_yrs_after_entry.median",
      "latest.earnings.1_yr_after_completion.overall_median_earnings",
      "latest.admissions.admission_rate.overall",
      "latest.completion.rate_suppressed.overall",
      "latest.student.size",
    ].join(",");

    const url = `${BASE_URL}/schools.json?school.name=${encodeURIComponent(searchName)}&fields=${fields}&api_key=${API_KEY}&per_page=5`;

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results?.length) return null;

    const best = data.results[0] as ScorecardSchoolResult;

    return {
      schoolName: best["school.name"],
      city: best["school.city"],
      state: best["school.state"],
      medianEarnings10yr: best["latest.earnings.10_yrs_after_entry.median"],
      medianEarnings6yr: best["latest.earnings.6_yrs_after_entry.median"],
      medianEarnings1yr: best["latest.earnings.1_yr_after_completion.overall_median_earnings"],
      admissionRate: best["latest.admissions.admission_rate.overall"],
      completionRate: best["latest.completion.rate_suppressed.overall"],
      studentSize: best["latest.student.size"],
      source: "US Department of Education College Scorecard API (latest data)",
    };
  });
}

export async function getProgramEarnings(
  universityName: string,
  course: string,
  degree: string
): Promise<ProgramEarningsData | null> {
  const cipCode = CIP_CODE_MAP[course];
  if (!cipCode) return null;

  const credentialLevel = degree.toUpperCase() === "PHD" ? 8
    : ["MS", "MA", "MTECH", "MENG", "M.SC", "M.TECH"].includes(degree.toUpperCase()) ? 7
    : degree.toUpperCase() === "MBA" ? 7
    : 6;

  const cacheKey = `scorecard:program:${normalize(universityName)}:${cipCode}:${credentialLevel}`;

  return getCached(cacheKey, async () => {
    const searchName = normalize(universityName);
    const fields = [
      "unit_id",
      "school.name",
      "latest.earnings.1_yr_after_completion.overall_median_earnings",
      "latest.earnings.4_yrs_after_completion.overall_median_earnings",
      "latest.cost.avg_net_price.overall",
    ].join(",");

    const url = `${BASE_URL}/schools.json?school.name=${encodeURIComponent(searchName)}&latest.programs.cip_4_digit.code=${cipCode}&latest.programs.cip_4_digit.credential.level=${credentialLevel}&fields=${fields}&api_key=${API_KEY}&per_page=5`;

    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results?.length) return null;

    const best = data.results[0] as ScorecardProgramResult;

    return {
      schoolName: best["school.name"],
      medianEarnings1yr: best["latest.earnings.1_yr_after_completion.overall_median_earnings"],
      medianEarnings4yr: best["latest.earnings.4_yrs_after_completion.overall_median_earnings"],
      avgNetPrice: best["latest.cost.avg_net_price.overall"],
      source: "US College Scorecard Program-Level Earnings API (latest data)",
    };
  });
}
