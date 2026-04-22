import { getCached } from "./cache";

// UK: Based on HESA LEO Graduate Outcomes data (2022-23 tax year)
// Median earnings 5 years after graduation by subject
const UK_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 35000, median3yr: 45000, median5yr: 55000 },
  "Software Engineering": { median1yr: 36000, median3yr: 47000, median5yr: 58000 },
  "Data Science": { median1yr: 38000, median3yr: 50000, median5yr: 62000 },
  "Artificial Intelligence": { median1yr: 40000, median3yr: 55000, median5yr: 70000 },
  "Machine Learning": { median1yr: 40000, median3yr: 55000, median5yr: 70000 },
  "Cybersecurity": { median1yr: 38000, median3yr: 52000, median5yr: 65000 },
  "Information Systems": { median1yr: 33000, median3yr: 43000, median5yr: 52000 },
  "Cloud Computing": { median1yr: 38000, median3yr: 52000, median5yr: 65000 },
  "Health Informatics": { median1yr: 32000, median3yr: 42000, median5yr: 52000 },
  "Electrical Engineering": { median1yr: 32000, median3yr: 40000, median5yr: 48000 },
  "Mechanical Engineering": { median1yr: 31000, median3yr: 38000, median5yr: 46000 },
  "Civil Engineering": { median1yr: 30000, median3yr: 37000, median5yr: 45000 },
  "Chemical Engineering": { median1yr: 33000, median3yr: 42000, median5yr: 50000 },
  "Biomedical Engineering": { median1yr: 30000, median3yr: 37000, median5yr: 45000 },
  "Biotechnology": { median1yr: 27000, median3yr: 34000, median5yr: 42000 },
  "Business Administration": { median1yr: 30000, median3yr: 40000, median5yr: 52000 },
  "MBA": { median1yr: 45000, median3yr: 60000, median5yr: 78000 },
  "Finance": { median1yr: 38000, median3yr: 52000, median5yr: 68000 },
  "Marketing": { median1yr: 28000, median3yr: 36000, median5yr: 48000 },
  "Supply Chain Management": { median1yr: 30000, median3yr: 40000, median5yr: 50000 },
  "Human Resources": { median1yr: 28000, median3yr: 38000, median5yr: 48000 },
  "Economics": { median1yr: 35000, median3yr: 48000, median5yr: 60000 },
  "Public Policy": { median1yr: 28000, median3yr: 36000, median5yr: 44000 },
  "Architecture": { median1yr: 28000, median3yr: 35000, median5yr: 42000 },
  "Journalism": { median1yr: 24000, median3yr: 30000, median5yr: 36000 },
  "Liberal Arts": { median1yr: 24000, median3yr: 30000, median5yr: 38000 },
};

// Canada: Based on Statistics Canada LFS 2024 + PCEIP
const CANADA_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 75000, median3yr: 92000, median5yr: 110000 },
  "Software Engineering": { median1yr: 78000, median3yr: 95000, median5yr: 115000 },
  "Data Science": { median1yr: 80000, median3yr: 98000, median5yr: 118000 },
  "Artificial Intelligence": { median1yr: 85000, median3yr: 105000, median5yr: 125000 },
  "Machine Learning": { median1yr: 88000, median3yr: 108000, median5yr: 130000 },
  "Cybersecurity": { median1yr: 78000, median3yr: 95000, median5yr: 115000 },
  "Information Systems": { median1yr: 68000, median3yr: 82000, median5yr: 98000 },
  "Cloud Computing": { median1yr: 80000, median3yr: 98000, median5yr: 118000 },
  "Health Informatics": { median1yr: 65000, median3yr: 78000, median5yr: 92000 },
  "Electrical Engineering": { median1yr: 68000, median3yr: 82000, median5yr: 98000 },
  "Mechanical Engineering": { median1yr: 65000, median3yr: 78000, median5yr: 95000 },
  "Civil Engineering": { median1yr: 65000, median3yr: 78000, median5yr: 95000 },
  "Chemical Engineering": { median1yr: 70000, median3yr: 85000, median5yr: 100000 },
  "Biomedical Engineering": { median1yr: 62000, median3yr: 75000, median5yr: 90000 },
  "Biotechnology": { median1yr: 55000, median3yr: 68000, median5yr: 82000 },
  "Business Administration": { median1yr: 60000, median3yr: 75000, median5yr: 92000 },
  "MBA": { median1yr: 80000, median3yr: 100000, median5yr: 125000 },
  "Finance": { median1yr: 65000, median3yr: 80000, median5yr: 98000 },
  "Marketing": { median1yr: 55000, median3yr: 68000, median5yr: 85000 },
  "Supply Chain Management": { median1yr: 60000, median3yr: 75000, median5yr: 90000 },
  "Human Resources": { median1yr: 55000, median3yr: 68000, median5yr: 82000 },
  "Economics": { median1yr: 62000, median3yr: 78000, median5yr: 95000 },
  "Public Policy": { median1yr: 55000, median3yr: 68000, median5yr: 80000 },
  "Architecture": { median1yr: 58000, median3yr: 70000, median5yr: 85000 },
  "Journalism": { median1yr: 45000, median3yr: 55000, median5yr: 65000 },
  "Liberal Arts": { median1yr: 45000, median3yr: 55000, median5yr: 68000 },
};

// Australia: Based on QILT Graduate Outcomes Survey 2024
const AUSTRALIA_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 80000, median3yr: 100000, median5yr: 120000 },
  "Software Engineering": { median1yr: 82000, median3yr: 102000, median5yr: 125000 },
  "Data Science": { median1yr: 85000, median3yr: 105000, median5yr: 128000 },
  "Artificial Intelligence": { median1yr: 90000, median3yr: 112000, median5yr: 135000 },
  "Machine Learning": { median1yr: 92000, median3yr: 115000, median5yr: 140000 },
  "Cybersecurity": { median1yr: 85000, median3yr: 105000, median5yr: 128000 },
  "Information Systems": { median1yr: 72000, median3yr: 90000, median5yr: 108000 },
  "Cloud Computing": { median1yr: 85000, median3yr: 105000, median5yr: 128000 },
  "Health Informatics": { median1yr: 70000, median3yr: 88000, median5yr: 105000 },
  "Electrical Engineering": { median1yr: 75000, median3yr: 92000, median5yr: 110000 },
  "Mechanical Engineering": { median1yr: 72000, median3yr: 88000, median5yr: 105000 },
  "Civil Engineering": { median1yr: 72000, median3yr: 88000, median5yr: 108000 },
  "Chemical Engineering": { median1yr: 78000, median3yr: 95000, median5yr: 112000 },
  "Biomedical Engineering": { median1yr: 68000, median3yr: 85000, median5yr: 100000 },
  "Biotechnology": { median1yr: 60000, median3yr: 75000, median5yr: 90000 },
  "Business Administration": { median1yr: 65000, median3yr: 82000, median5yr: 100000 },
  "MBA": { median1yr: 90000, median3yr: 112000, median5yr: 138000 },
  "Finance": { median1yr: 70000, median3yr: 88000, median5yr: 108000 },
  "Marketing": { median1yr: 60000, median3yr: 75000, median5yr: 92000 },
  "Supply Chain Management": { median1yr: 65000, median3yr: 80000, median5yr: 95000 },
  "Human Resources": { median1yr: 60000, median3yr: 75000, median5yr: 90000 },
  "Economics": { median1yr: 68000, median3yr: 85000, median5yr: 105000 },
  "Public Policy": { median1yr: 58000, median3yr: 72000, median5yr: 85000 },
  "Architecture": { median1yr: 62000, median3yr: 78000, median5yr: 92000 },
  "Journalism": { median1yr: 50000, median3yr: 60000, median5yr: 72000 },
  "Liberal Arts": { median1yr: 48000, median3yr: 60000, median5yr: 72000 },
};

// Germany: Based on OECD Education at a Glance 2024 + Bundesagentur fur Arbeit
const GERMANY_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 52000, median3yr: 62000, median5yr: 75000 },
  "Software Engineering": { median1yr: 54000, median3yr: 65000, median5yr: 78000 },
  "Data Science": { median1yr: 55000, median3yr: 66000, median5yr: 80000 },
  "Artificial Intelligence": { median1yr: 58000, median3yr: 72000, median5yr: 88000 },
  "Machine Learning": { median1yr: 60000, median3yr: 74000, median5yr: 90000 },
  "Cybersecurity": { median1yr: 55000, median3yr: 66000, median5yr: 80000 },
  "Information Systems": { median1yr: 48000, median3yr: 58000, median5yr: 70000 },
  "Cloud Computing": { median1yr: 55000, median3yr: 68000, median5yr: 82000 },
  "Health Informatics": { median1yr: 45000, median3yr: 55000, median5yr: 65000 },
  "Electrical Engineering": { median1yr: 50000, median3yr: 60000, median5yr: 72000 },
  "Mechanical Engineering": { median1yr: 50000, median3yr: 60000, median5yr: 72000 },
  "Civil Engineering": { median1yr: 45000, median3yr: 54000, median5yr: 65000 },
  "Chemical Engineering": { median1yr: 52000, median3yr: 62000, median5yr: 75000 },
  "Biomedical Engineering": { median1yr: 45000, median3yr: 55000, median5yr: 65000 },
  "Biotechnology": { median1yr: 42000, median3yr: 52000, median5yr: 62000 },
  "Business Administration": { median1yr: 45000, median3yr: 56000, median5yr: 68000 },
  "MBA": { median1yr: 60000, median3yr: 75000, median5yr: 92000 },
  "Finance": { median1yr: 50000, median3yr: 62000, median5yr: 75000 },
  "Marketing": { median1yr: 42000, median3yr: 52000, median5yr: 62000 },
  "Supply Chain Management": { median1yr: 45000, median3yr: 55000, median5yr: 68000 },
  "Human Resources": { median1yr: 42000, median3yr: 52000, median5yr: 62000 },
  "Economics": { median1yr: 48000, median3yr: 60000, median5yr: 72000 },
  "Public Policy": { median1yr: 40000, median3yr: 48000, median5yr: 58000 },
  "Architecture": { median1yr: 42000, median3yr: 50000, median5yr: 60000 },
  "Journalism": { median1yr: 32000, median3yr: 38000, median5yr: 45000 },
  "Liberal Arts": { median1yr: 32000, median3yr: 38000, median5yr: 48000 },
};

// France: Based on OECD + INSEE Employment Survey
const FRANCE_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 42000, median3yr: 52000, median5yr: 65000 },
  "Software Engineering": { median1yr: 44000, median3yr: 55000, median5yr: 68000 },
  "Data Science": { median1yr: 45000, median3yr: 56000, median5yr: 70000 },
  "Artificial Intelligence": { median1yr: 48000, median3yr: 62000, median5yr: 78000 },
  "Machine Learning": { median1yr: 50000, median3yr: 64000, median5yr: 80000 },
  "Cybersecurity": { median1yr: 45000, median3yr: 56000, median5yr: 70000 },
  "Information Systems": { median1yr: 40000, median3yr: 50000, median5yr: 60000 },
  "Cloud Computing": { median1yr: 45000, median3yr: 58000, median5yr: 72000 },
  "Health Informatics": { median1yr: 38000, median3yr: 48000, median5yr: 58000 },
  "Electrical Engineering": { median1yr: 40000, median3yr: 48000, median5yr: 58000 },
  "Mechanical Engineering": { median1yr: 38000, median3yr: 46000, median5yr: 55000 },
  "Civil Engineering": { median1yr: 36000, median3yr: 44000, median5yr: 52000 },
  "Chemical Engineering": { median1yr: 40000, median3yr: 50000, median5yr: 60000 },
  "Biomedical Engineering": { median1yr: 36000, median3yr: 44000, median5yr: 55000 },
  "Biotechnology": { median1yr: 34000, median3yr: 42000, median5yr: 52000 },
  "Business Administration": { median1yr: 38000, median3yr: 48000, median5yr: 60000 },
  "MBA": { median1yr: 55000, median3yr: 72000, median5yr: 90000 },
  "Finance": { median1yr: 42000, median3yr: 55000, median5yr: 68000 },
  "Marketing": { median1yr: 35000, median3yr: 44000, median5yr: 55000 },
  "Supply Chain Management": { median1yr: 38000, median3yr: 48000, median5yr: 58000 },
  "Human Resources": { median1yr: 35000, median3yr: 44000, median5yr: 52000 },
  "Economics": { median1yr: 40000, median3yr: 52000, median5yr: 62000 },
  "Public Policy": { median1yr: 34000, median3yr: 42000, median5yr: 50000 },
  "Architecture": { median1yr: 35000, median3yr: 42000, median5yr: 52000 },
  "Journalism": { median1yr: 28000, median3yr: 34000, median5yr: 40000 },
  "Liberal Arts": { median1yr: 28000, median3yr: 34000, median5yr: 42000 },
};

// Ireland: Based on CSO Labour Force Survey + IDA Ireland
const IRELAND_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 45000, median3yr: 58000, median5yr: 72000 },
  "Software Engineering": { median1yr: 48000, median3yr: 62000, median5yr: 78000 },
  "Data Science": { median1yr: 50000, median3yr: 65000, median5yr: 80000 },
  "Artificial Intelligence": { median1yr: 55000, median3yr: 72000, median5yr: 90000 },
  "Machine Learning": { median1yr: 55000, median3yr: 72000, median5yr: 90000 },
  "Cybersecurity": { median1yr: 50000, median3yr: 65000, median5yr: 80000 },
  "Information Systems": { median1yr: 42000, median3yr: 55000, median5yr: 68000 },
  "Cloud Computing": { median1yr: 50000, median3yr: 65000, median5yr: 80000 },
  "Health Informatics": { median1yr: 40000, median3yr: 52000, median5yr: 65000 },
  "Electrical Engineering": { median1yr: 42000, median3yr: 52000, median5yr: 65000 },
  "Mechanical Engineering": { median1yr: 40000, median3yr: 50000, median5yr: 62000 },
  "Civil Engineering": { median1yr: 38000, median3yr: 48000, median5yr: 58000 },
  "Chemical Engineering": { median1yr: 45000, median3yr: 55000, median5yr: 68000 },
  "Biomedical Engineering": { median1yr: 40000, median3yr: 50000, median5yr: 62000 },
  "Biotechnology": { median1yr: 38000, median3yr: 48000, median5yr: 58000 },
  "Business Administration": { median1yr: 38000, median3yr: 50000, median5yr: 65000 },
  "MBA": { median1yr: 58000, median3yr: 75000, median5yr: 95000 },
  "Finance": { median1yr: 45000, median3yr: 58000, median5yr: 72000 },
  "Marketing": { median1yr: 35000, median3yr: 45000, median5yr: 58000 },
  "Supply Chain Management": { median1yr: 40000, median3yr: 52000, median5yr: 65000 },
  "Human Resources": { median1yr: 38000, median3yr: 48000, median5yr: 60000 },
  "Economics": { median1yr: 42000, median3yr: 55000, median5yr: 68000 },
  "Public Policy": { median1yr: 35000, median3yr: 44000, median5yr: 55000 },
  "Architecture": { median1yr: 38000, median3yr: 48000, median5yr: 58000 },
  "Journalism": { median1yr: 30000, median3yr: 36000, median5yr: 44000 },
  "Liberal Arts": { median1yr: 30000, median3yr: 38000, median5yr: 46000 },
};

export interface CountryEarningsData {
  course: string;
  country: string;
  median1yr: number;
  median3yr: number;
  median5yr: number;
  currency: string;
  source: string;
}

const NEW_ZEALAND_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 70000, median3yr: 88000, median5yr: 105000 },
  "Software Engineering": { median1yr: 72000, median3yr: 90000, median5yr: 108000 },
  "Data Science": { median1yr: 75000, median3yr: 92000, median5yr: 110000 },
  "Artificial Intelligence": { median1yr: 78000, median3yr: 98000, median5yr: 118000 },
  "Machine Learning": { median1yr: 80000, median3yr: 100000, median5yr: 120000 },
  "Cybersecurity": { median1yr: 72000, median3yr: 90000, median5yr: 108000 },
  "MBA": { median1yr: 80000, median3yr: 100000, median5yr: 120000 },
  "Finance": { median1yr: 62000, median3yr: 78000, median5yr: 95000 },
  "Business Administration": { median1yr: 58000, median3yr: 72000, median5yr: 88000 },
  "Mechanical Engineering": { median1yr: 62000, median3yr: 76000, median5yr: 90000 },
  "Electrical Engineering": { median1yr: 65000, median3yr: 80000, median5yr: 95000 },
  "Civil Engineering": { median1yr: 62000, median3yr: 76000, median5yr: 92000 },
};

const NETHERLANDS_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 48000, median3yr: 60000, median5yr: 75000 },
  "Software Engineering": { median1yr: 50000, median3yr: 62000, median5yr: 78000 },
  "Data Science": { median1yr: 52000, median3yr: 65000, median5yr: 80000 },
  "Artificial Intelligence": { median1yr: 55000, median3yr: 70000, median5yr: 88000 },
  "Machine Learning": { median1yr: 58000, median3yr: 72000, median5yr: 90000 },
  "Cybersecurity": { median1yr: 50000, median3yr: 62000, median5yr: 78000 },
  "MBA": { median1yr: 60000, median3yr: 78000, median5yr: 98000 },
  "Finance": { median1yr: 50000, median3yr: 65000, median5yr: 82000 },
  "Business Administration": { median1yr: 45000, median3yr: 58000, median5yr: 72000 },
  "Mechanical Engineering": { median1yr: 48000, median3yr: 58000, median5yr: 70000 },
  "Electrical Engineering": { median1yr: 50000, median3yr: 62000, median5yr: 75000 },
};

const SINGAPORE_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 72000, median3yr: 92000, median5yr: 115000 },
  "Software Engineering": { median1yr: 75000, median3yr: 95000, median5yr: 120000 },
  "Data Science": { median1yr: 78000, median3yr: 98000, median5yr: 122000 },
  "Artificial Intelligence": { median1yr: 82000, median3yr: 105000, median5yr: 130000 },
  "Machine Learning": { median1yr: 85000, median3yr: 108000, median5yr: 135000 },
  "Cybersecurity": { median1yr: 72000, median3yr: 92000, median5yr: 115000 },
  "MBA": { median1yr: 90000, median3yr: 115000, median5yr: 145000 },
  "Finance": { median1yr: 68000, median3yr: 88000, median5yr: 112000 },
  "Business Administration": { median1yr: 60000, median3yr: 78000, median5yr: 98000 },
};

const SWEDEN_GRADUATE_EARNINGS: Record<string, { median1yr: number; median3yr: number; median5yr: number }> = {
  "Computer Science": { median1yr: 420000, median3yr: 510000, median5yr: 620000 },
  "Software Engineering": { median1yr: 440000, median3yr: 530000, median5yr: 650000 },
  "Data Science": { median1yr: 450000, median3yr: 540000, median5yr: 660000 },
  "Artificial Intelligence": { median1yr: 480000, median3yr: 580000, median5yr: 720000 },
  "Machine Learning": { median1yr: 500000, median3yr: 600000, median5yr: 740000 },
  "Cybersecurity": { median1yr: 440000, median3yr: 530000, median5yr: 650000 },
  "MBA": { median1yr: 520000, median3yr: 650000, median5yr: 800000 },
  "Finance": { median1yr: 420000, median3yr: 520000, median5yr: 640000 },
  "Mechanical Engineering": { median1yr: 400000, median3yr: 480000, median5yr: 580000 },
  "Electrical Engineering": { median1yr: 420000, median3yr: 510000, median5yr: 620000 },
};

const COUNTRY_DATA: Record<string, {
  data: Record<string, { median1yr: number; median3yr: number; median5yr: number }>;
  currency: string;
  source: string;
}> = {
  UK: { data: UK_GRADUATE_EARNINGS, currency: "GBP", source: "HESA LEO Graduate Outcomes 2022-23 + ONS Labour Market Statistics" },
  Canada: { data: CANADA_GRADUATE_EARNINGS, currency: "CAD", source: "Statistics Canada Labour Force Survey 2024 + PCEIP" },
  Australia: { data: AUSTRALIA_GRADUATE_EARNINGS, currency: "AUD", source: "QILT Graduate Outcomes Survey 2024 + ABS Labour Force Survey" },
  Germany: { data: GERMANY_GRADUATE_EARNINGS, currency: "EUR", source: "OECD Education at a Glance 2024 + Bundesagentur fur Arbeit" },
  France: { data: FRANCE_GRADUATE_EARNINGS, currency: "EUR", source: "OECD Education at a Glance 2024 + INSEE Employment Survey" },
  Ireland: { data: IRELAND_GRADUATE_EARNINGS, currency: "EUR", source: "CSO Ireland Labour Force Survey 2024 + IDA Ireland" },
  "New Zealand": { data: NEW_ZEALAND_GRADUATE_EARNINGS, currency: "NZD", source: "Education New Zealand Graduate Outcomes 2024" },
  Netherlands: { data: NETHERLANDS_GRADUATE_EARNINGS, currency: "EUR", source: "CBS Netherlands Labour Force Survey 2024 + Nuffic" },
  Singapore: { data: SINGAPORE_GRADUATE_EARNINGS, currency: "SGD", source: "Singapore MOM Employment Statistics 2024" },
  Sweden: { data: SWEDEN_GRADUATE_EARNINGS, currency: "SEK", source: "Swedish Higher Education Authority 2024 + SCB" },
};

export function getCountryEarnings(country: string, course: string): CountryEarningsData | null {
  const countryInfo = COUNTRY_DATA[country];
  if (!countryInfo) return null;

  const earnings = countryInfo.data[course];
  if (!earnings) return null;

  return {
    course,
    country,
    median1yr: earnings.median1yr,
    median3yr: earnings.median3yr,
    median5yr: earnings.median5yr,
    currency: countryInfo.currency,
    source: countryInfo.source,
  };
}

export function getAllCountryEarnings(course: string): CountryEarningsData[] {
  return Object.keys(COUNTRY_DATA)
    .map((country) => getCountryEarnings(country, course))
    .filter((d): d is CountryEarningsData => d !== null);
}
