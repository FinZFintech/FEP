import { getCached } from "./cache";

const BASE_URL = "https://services.onetcenter.org/ws";
const USERNAME = process.env.ONET_USERNAME || "";
const PASSWORD = process.env.ONET_PASSWORD || "";

export interface ONetOccupationData {
  code: string;
  title: string;
  description: string;
  brightOutlook: boolean;
  greenOccupation: boolean;
  salaryMedian: number | null;
  salary10th: number | null;
  salary90th: number | null;
  jobOpenings: number | null;
  topSkills: string[];
  educationRequired: string | null;
  source: string;
}

const SOC_CODE_MAP: Record<string, string> = {
  "Computer Science": "15-1252.00",
  "Software Engineering": "15-1252.00",
  "Data Science": "15-2051.00",
  "Artificial Intelligence": "15-2051.00",
  "Machine Learning": "15-2051.00",
  "Cybersecurity": "15-1212.00",
  "Information Systems": "15-1211.00",
  "Cloud Computing": "15-1241.00",
  "Health Informatics": "15-1211.00",
  "Electrical Engineering": "17-2071.00",
  "Mechanical Engineering": "17-2141.00",
  "Civil Engineering": "17-2051.00",
  "Chemical Engineering": "17-2041.00",
  "Biomedical Engineering": "17-2031.00",
  "Biotechnology": "19-1021.00",
  "Business Administration": "11-1021.00",
  "MBA": "11-1021.00",
  "Finance": "13-2051.00",
  "Marketing": "11-2021.00",
  "Supply Chain Management": "13-1081.00",
  "Human Resources": "11-3121.00",
  "Economics": "19-3011.00",
  "Public Policy": "11-1031.00",
  "Architecture": "17-1011.00",
  "Journalism": "27-3023.00",
  "Liberal Arts": "25-1199.00",
};

function authHeader(): string {
  if (!USERNAME || !PASSWORD) return "";
  return "Basic " + Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
}

export async function getOccupationDetails(course: string): Promise<ONetOccupationData | null> {
  const socCode = SOC_CODE_MAP[course];
  if (!socCode) return null;

  const auth = authHeader();
  if (!auth) return null;

  const cacheKey = `onet:occupation:${socCode}`;

  return getCached(cacheKey, async () => {
    const headers: Record<string, string> = {
      Authorization: auth,
      Accept: "application/json",
    };

    // Fetch occupation summary
    const summaryRes = await fetch(`${BASE_URL}/mnm/careers/${socCode}`, {
      headers,
      next: { revalidate: 604800 },
    });
    if (!summaryRes.ok) return null;
    const summary = await summaryRes.json();

    // Fetch salary data
    let salaryData: { median: number | null; pct10: number | null; pct90: number | null } = {
      median: null, pct10: null, pct90: null,
    };
    try {
      const salaryRes = await fetch(`${BASE_URL}/mnm/careers/${socCode}/salary`, {
        headers,
        next: { revalidate: 604800 },
      });
      if (salaryRes.ok) {
        const salary = await salaryRes.json();
        if (salary.annual_wages) {
          salaryData = {
            median: salary.annual_wages.median ?? null,
            pct10: salary.annual_wages.pct10 ?? null,
            pct90: salary.annual_wages.pct90 ?? null,
          };
        }
      }
    } catch {
      // salary endpoint failed, continue without
    }

    // Fetch skills
    let topSkills: string[] = [];
    try {
      const skillsRes = await fetch(`${BASE_URL}/online/occupations/${socCode}/summary/skills`, {
        headers,
        next: { revalidate: 604800 },
      });
      if (skillsRes.ok) {
        const skills = await skillsRes.json();
        topSkills = (skills.element ?? [])
          .slice(0, 5)
          .map((s: { name: string }) => s.name);
      }
    } catch {
      // skills endpoint failed, continue without
    }

    return {
      code: socCode,
      title: summary.title ?? course,
      description: summary.what_they_do ?? "",
      brightOutlook: summary.bright_outlook ?? false,
      greenOccupation: summary.green ?? false,
      salaryMedian: salaryData.median,
      salary10th: salaryData.pct10,
      salary90th: salaryData.pct90,
      jobOpenings: summary.projected_openings ?? null,
      topSkills,
      educationRequired: summary.education?.title ?? null,
      source: "O*NET OnLine (v30.2) — U.S. Department of Labor",
    };
  });
}
