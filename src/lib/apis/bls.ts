import { getCached } from "./cache";

const BASE_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const API_KEY = process.env.BLS_API_KEY || "";

interface BLSSeriesData {
  year: string;
  period: string;
  periodName: string;
  value: string;
}

interface BLSResponse {
  status: string;
  Results: {
    series: Array<{
      seriesID: string;
      data: BLSSeriesData[];
    }>;
  };
}

export interface OccupationWageData {
  socCode: string;
  annualMeanWage: number | null;
  annualMedianWage: number | null;
  annualWage10th: number | null;
  annualWage25th: number | null;
  annualWage75th: number | null;
  annualWage90th: number | null;
  totalEmployment: number | null;
  year: string;
  source: string;
}

// BLS OES series ID format: OEUM[area][datatype][industry][occupation]
// area: 0000000 = national
// datatype: 01=employment, 04=mean wage, 13=median wage, 07=10th pct, 08=25th pct, 11=75th pct, 12=90th pct
function buildSeriesId(socCode: string, dataType: string): string {
  const soc = socCode.replace("-", "");
  return `OEUM000000000000000${soc}${dataType}`;
}

const SOC_CODE_MAP: Record<string, string> = {
  "Computer Science": "15-1252",
  "Software Engineering": "15-1252",
  "Data Science": "15-2051",
  "Artificial Intelligence": "15-2051",
  "Machine Learning": "15-2051",
  "Cybersecurity": "15-1212",
  "Information Systems": "15-1211",
  "Cloud Computing": "15-1241",
  "Health Informatics": "15-1211",
  "Electrical Engineering": "17-2071",
  "Mechanical Engineering": "17-2141",
  "Civil Engineering": "17-2051",
  "Chemical Engineering": "17-2041",
  "Biomedical Engineering": "17-2031",
  "Biotechnology": "19-1021",
  "Business Administration": "11-1021",
  "MBA": "11-1021",
  "Finance": "13-2051",
  "Marketing": "11-2021",
  "Supply Chain Management": "13-1081",
  "Human Resources": "11-3121",
  "Economics": "19-3011",
  "Public Policy": "11-1031",
  "Architecture": "17-1011",
  "Journalism": "27-3023",
  "Liberal Arts": "25-1199",
};

function extractLatestValue(seriesData: BLSSeriesData[]): { value: number | null; year: string } {
  if (!seriesData?.length) return { value: null, year: "" };
  const annual = seriesData.find((d) => d.period === "A01") ?? seriesData[0];
  const val = parseFloat(annual.value);
  return { value: isNaN(val) ? null : val, year: annual.year };
}

export async function getOccupationWages(course: string): Promise<OccupationWageData | null> {
  const socCode = SOC_CODE_MAP[course];
  if (!socCode) return null;

  const cacheKey = `bls:oes:${socCode}`;

  return getCached(cacheKey, async () => {
    const dataTypes = {
      employment: "01",
      meanWage: "04",
      wage10th: "07",
      wage25th: "08",
      wage75th: "11",
      wage90th: "12",
      medianWage: "13",
    };

    const seriesIds = Object.values(dataTypes).map((dt) => buildSeriesId(socCode, dt));

    const body = {
      seriesid: seriesIds,
      startyear: String(new Date().getFullYear() - 2),
      endyear: String(new Date().getFullYear()),
      ...(API_KEY ? { registrationkey: API_KEY } : {}),
    };

    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 604800 },
    });

    if (!res.ok) return null;

    const json = (await res.json()) as BLSResponse;
    if (json.status !== "REQUEST_SUCCEEDED" || !json.Results?.series) return null;

    const seriesMap = new Map<string, BLSSeriesData[]>();
    for (const s of json.Results.series) {
      seriesMap.set(s.seriesID, s.data);
    }

    const getVal = (dt: string) => {
      const sid = buildSeriesId(socCode, dt);
      const data = seriesMap.get(sid);
      return data ? extractLatestValue(data) : { value: null, year: "" };
    };

    const median = getVal(dataTypes.medianWage);

    return {
      socCode,
      annualMeanWage: getVal(dataTypes.meanWage).value,
      annualMedianWage: median.value,
      annualWage10th: getVal(dataTypes.wage10th).value,
      annualWage25th: getVal(dataTypes.wage25th).value,
      annualWage75th: getVal(dataTypes.wage75th).value,
      annualWage90th: getVal(dataTypes.wage90th).value,
      totalEmployment: getVal(dataTypes.employment).value,
      year: median.year,
      source: `BLS Occupational Employment and Wage Statistics (OEWS) ${median.year}`,
    };
  });
}

// BLS Employment Projections — growth rate
export interface OccupationGrowthData {
  socCode: string;
  projectedGrowthPct: number | null;
  projectionPeriod: string;
  source: string;
}

const GROWTH_RATE_MAP: Record<string, { rate: number; period: string }> = {
  "15-1252": { rate: 17, period: "2023-2033" },
  "15-2051": { rate: 36, period: "2023-2033" },
  "15-1212": { rate: 33, period: "2023-2033" },
  "15-1211": { rate: 11, period: "2023-2033" },
  "15-1241": { rate: 15, period: "2023-2033" },
  "17-2071": { rate: 9, period: "2023-2033" },
  "17-2141": { rate: 11, period: "2023-2033" },
  "17-2051": { rate: 6, period: "2023-2033" },
  "17-2041": { rate: 8, period: "2023-2033" },
  "17-2031": { rate: 10, period: "2023-2033" },
  "19-1021": { rate: 11, period: "2023-2033" },
  "11-1021": { rate: 5, period: "2023-2033" },
  "13-2051": { rate: 9, period: "2023-2033" },
  "11-2021": { rate: 8, period: "2023-2033" },
  "13-1081": { rate: 18, period: "2023-2033" },
  "11-3121": { rate: 5, period: "2023-2033" },
  "19-3011": { rate: 7, period: "2023-2033" },
  "11-1031": { rate: 6, period: "2023-2033" },
  "17-1011": { rate: 5, period: "2023-2033" },
  "27-3023": { rate: -3, period: "2023-2033" },
  "25-1199": { rate: 4, period: "2023-2033" },
};

export function getOccupationGrowth(course: string): OccupationGrowthData | null {
  const socCode = SOC_CODE_MAP[course];
  if (!socCode) return null;

  const growth = GROWTH_RATE_MAP[socCode];
  if (!growth) return null;

  return {
    socCode,
    projectedGrowthPct: growth.rate,
    projectionPeriod: growth.period,
    source: `BLS Employment Projections ${growth.period}`,
  };
}
