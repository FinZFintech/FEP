import type { AssessmentInput, EPResult, FIPResult, EPBreakdownItem, FIPBreakdownItem, LoanToIncomeResult } from "./types";
import { getSchoolEarnings, getProgramEarnings, getOccupationWages, getOccupationGrowth, getH1BSalary, getOccupationDetails } from "../apis";
import { getCountryEarnings } from "../apis/country-earnings";

import universitiesData from "./lookups/universities.json";
import coursesData from "./lookups/courses.json";
import countriesData from "./lookups/countries.json";
import undergradTiersData from "./lookups/undergrad-tiers.json";
import nationalitiesData from "./lookups/nationalities.json";

type CourseKey = keyof typeof coursesData.courses;
type CountryKey = keyof typeof countriesData.countries;
type TierKey = keyof typeof undergradTiersData.tiers;

// ─── Helpers ───────────────────────────────────────────────────────────────

function getUniversityTierScore(universityName: string): { score: number; tier: string; label: string } {
  const tierMap = universitiesData._tiers as Record<string, { label: string; score: number }>;
  const uniMap = universitiesData.universities as Record<string, string>;

  const tierKey = uniMap[universityName] ?? "UNRANKED";
  const tierData = tierMap[tierKey] ?? tierMap["UNRANKED"];
  return { score: tierData.score, tier: tierKey, label: tierData.label };
}

function getCourseData(course: string) {
  const courseMap = coursesData.courses as Record<string, (typeof coursesData.courses)[CourseKey]>;
  return courseMap[course] ?? courseMap["Business Administration"];
}

function getCountryData(country: string) {
  const countryMap = countriesData.countries as Record<string, (typeof countriesData.countries)[CountryKey]>;
  return countryMap[country] ?? countryMap["US"];
}

function getTierData(tier: string) {
  const tierMap = undergradTiersData.tiers as Record<string, (typeof undergradTiersData.tiers)[TierKey]>;
  return tierMap[tier] ?? tierMap["OTHERS"];
}

interface NationalityDestData {
  salaryAdjustment: number;
  employabilityAdjustment: number;
  employerSponsorshipRate: number;
  avgMonthsToEmployment: number;
  source: string;
  visaType?: string;
  postStudyWorkMonthsStem?: number;
  postStudyWorkMonthsNonStem?: number;
  h1bLotteryProbGeneral?: number | null;
  h1bLotteryProbMasters?: number | null;
  notes?: string;
  topEmployers?: string[];
  employerTierSplit?: Record<string, { pct: number; salaryMultiplier: number }>;
}

function getNationalityData(nationality: string, country: string): NationalityDestData | null {
  const natMap = nationalitiesData.nationalities as Record<string, { destinations: Record<string, NationalityDestData> }>;
  const natData = natMap[nationality];
  if (!natData) return null;
  return natData.destinations[country] ?? null;
}

function getReturnSalaryMultiplier(nationality: string): number {
  const natMap = nationalitiesData.nationalities as Record<string, { returnCountrySalaryMultiplier: number }>;
  return natMap[nationality]?.returnCountrySalaryMultiplier ?? 0.25;
}

function cgpaScore(cgpa: number, baseline: number): number {
  const normalized = cgpa > 4.5 ? cgpa / 10 : cgpa / 4;
  const baselineNorm = baseline > 4.5 ? baseline / 10 : baseline / 4;
  const ratio = normalized / baselineNorm;
  return Math.min(100, Math.round(ratio * 100));
}

function greScoreFn(score?: number): { score: number; rationale: string } {
  if (!score) return { score: 50, rationale: "GRE not provided — neutral score applied" };
  if (score >= 325) return { score: 100, rationale: `GRE ${score} — Excellent (≥325)` };
  if (score >= 315) return { score: 85, rationale: `GRE ${score} — Strong (315–324)` };
  if (score >= 305) return { score: 70, rationale: `GRE ${score} — Good (305–314)` };
  if (score >= 295) return { score: 55, rationale: `GRE ${score} — Average (295–304)` };
  return { score: 35, rationale: `GRE ${score} — Below average (<295)` };
}

function gmatScoreFn(score?: number): { score: number; rationale: string } {
  if (!score) return { score: 50, rationale: "GMAT not provided — neutral score applied" };
  if (score >= 720) return { score: 100, rationale: `GMAT ${score} — Excellent (≥720)` };
  if (score >= 680) return { score: 85, rationale: `GMAT ${score} — Strong (680–719)` };
  if (score >= 640) return { score: 70, rationale: `GMAT ${score} — Good (640–679)` };
  if (score >= 600) return { score: 55, rationale: `GMAT ${score} — Average (600–639)` };
  return { score: 35, rationale: `GMAT ${score} — Below average (<600)` };
}

function workExpScore(years: number): { score: number; rationale: string } {
  if (years >= 5) return { score: 100, rationale: `${years} years — Significant experience` };
  if (years >= 3) return { score: 80, rationale: `${years} years — Good experience` };
  if (years >= 1) return { score: 60, rationale: `${years} years — Some experience` };
  return { score: 40, rationale: "Fresh graduate — limited work experience" };
}

function blsGrowthScore(growth: number): { score: number; rationale: string; source: string } {
  const src = "BLS Employment Projections 2023–2033";
  if (growth >= 25) return { score: 100, rationale: `${growth}% projected 10-yr growth — Very high demand`, source: src };
  if (growth >= 15) return { score: 88, rationale: `${growth}% projected 10-yr growth — High demand`, source: src };
  if (growth >= 10) return { score: 75, rationale: `${growth}% projected 10-yr growth — Above-average demand`, source: src };
  if (growth >= 5) return { score: 60, rationale: `${growth}% projected 10-yr growth — Moderate demand`, source: src };
  if (growth >= 0) return { score: 45, rationale: `${growth}% projected 10-yr growth — Low demand`, source: src };
  return { score: 20, rationale: `${growth}% projected 10-yr growth — Declining occupation`, source: src };
}

function stemScore(isStem: boolean, country: string): { score: number; rationale: string } {
  const countryData = getCountryData(country);
  if (!isStem) {
    return { score: 40, rationale: `Non-STEM: ${countryData.optNonStemMonths}-month post-study work permit` };
  }
  if (country === "US") return { score: 100, rationale: "STEM OPT: 36-month post-study work authorization in US" };
  if (country === "Canada") return { score: 95, rationale: "STEM in Canada: 3-year PGWP — clear pathway to PR" };
  if (country === "Germany" || country === "Ireland") return { score: 85, rationale: `STEM advantage in ${country}: strong employer sponsorship rates` };
  return { score: 75, rationale: `STEM designation: ${countryData.optStemMonths}-month work authorization` };
}

function degreeMultiplier(degree: string): number {
  switch (degree.toUpperCase()) {
    case "PHD": return 1.10;
    case "MBA": return 1.18;
    case "MS": case "M.SC": case "MTECH": case "MENG": case "M.TECH": return 1.05;
    case "LLM": return 1.08;
    case "MFA": return 1.00;
    default: return 1.05;
  }
}

function getRiskBand(score: number): { band: "Low" | "Medium" | "High" | "Very High"; color: string } {
  if (score >= 75) return { band: "Low", color: "#16a34a" };
  if (score >= 60) return { band: "Medium", color: "#ca8a04" };
  if (score >= 45) return { band: "High", color: "#ea580c" };
  return { band: "Very High", color: "#dc2626" };
}

function getExchangeRate(currency: string): number {
  const rates: Record<string, number> = {
    USD: parseFloat(process.env.INR_PER_USD ?? "83.5"),
    GBP: parseFloat(process.env.INR_PER_GBP ?? "106.0"),
    CAD: parseFloat(process.env.INR_PER_CAD ?? "61.5"),
    AUD: parseFloat(process.env.INR_PER_AUD ?? "54.0"),
    EUR: parseFloat(process.env.INR_PER_EUR ?? "90.0"),
    NZD: parseFloat(process.env.INR_PER_NZD ?? "50.0"),
    SGD: parseFloat(process.env.INR_PER_SGD ?? "62.0"),
    SEK: parseFloat(process.env.INR_PER_SEK ?? "7.8"),
  };
  return rates[currency] ?? 83.5;
}

function getCityMultiplier(country: string, city?: string): number {
  if (!city) return 1.0;
  const countryData = getCountryData(country);
  const cities = countryData.cities as Record<string, number>;
  return cities[city] ?? cities["Other"] ?? 1.0;
}

// ─── EP Scorer (with live API data) ────────────────────────────────────────

export async function computeEP(input: AssessmentInput): Promise<EPResult> {
  const uniTierResult = getUniversityTierScore(input.destinationUniversity);
  const courseData = getCourseData(input.targetCourse);
  const countryData = getCountryData(input.destinationCountry);
  const tierData = getTierData(input.undergradTier);

  // Live API: BLS growth data
  const growthData = getOccupationGrowth(input.targetCourse);
  const growthRate = growthData?.projectedGrowthPct ?? courseData.blsGrowth10yr;
  const growthSource = growthData?.source ?? "BLS Employment Projections (static fallback)";

  // Live API: O*NET bright outlook
  let onetBonus = 0;
  let onetNote = "";
  if (input.destinationCountry === "US") {
    try {
      const onetData = await getOccupationDetails(input.targetCourse);
      if (onetData?.brightOutlook) {
        onetBonus = 5;
        onetNote = " | O*NET Bright Outlook occupation (+5)";
      }
    } catch { /* O*NET unavailable, continue */ }
  }

  // Live API: College Scorecard completion rate (US only)
  let completionBonus = 0;
  let completionNote = "";
  if (input.destinationCountry === "US") {
    try {
      const schoolData = await getSchoolEarnings(input.destinationUniversity);
      if (schoolData?.completionRate) {
        const cr = schoolData.completionRate;
        completionBonus = cr >= 0.9 ? 5 : cr >= 0.7 ? 3 : 0;
        if (completionBonus > 0) {
          completionNote = ` | ${Math.round(cr * 100)}% completion rate (+${completionBonus})`;
        }
      }
    } catch { /* Scorecard unavailable, continue */ }
  }

  // Nationality-specific adjustments
  const natData = getNationalityData(input.nationality ?? "Indian", input.destinationCountry);
  const natEpAdj = natData?.employabilityAdjustment ?? 0;
  let natNote = "";
  let natSource = "";
  if (natData && natEpAdj !== 0) {
    natNote = ` | ${input.nationality ?? "Indian"} national: visa/sponsorship adjustment (${natEpAdj > 0 ? "+" : ""}${natEpAdj})`;
    natSource = natData.source;

    if (input.destinationCountry === "US" && natData.h1bLotteryProbMasters) {
      const lotteryProb = input.targetDegree?.toUpperCase() === "PHD" ? 0.95 : natData.h1bLotteryProbMasters;
      natNote += ` | H1B lottery: ~${Math.round(lotteryProb * 100)}% selection rate`;
    }
  }

  const cgpa = cgpaScore(input.undergradCgpa, tierData.cgpaBaseline);
  const testResult = input.gmatScore ? gmatScoreFn(input.gmatScore) : greScoreFn(input.greScore);
  const caliber = Math.round((tierData.score * 0.5) + (cgpa * 0.35) + (testResult.score * 0.15));

  const blsGrowth = blsGrowthScore(growthRate);
  const stem = stemScore(input.isStem, input.destinationCountry);
  const workExp = workExpScore(input.workExperienceYears);
  const countryEmployment = Math.round(countryData.gradEmploymentRate * 100);

  const breakdown: EPBreakdownItem[] = [
    {
      factor: "Destination University Tier",
      weight: 0.25,
      rawScore: Math.min(100, uniTierResult.score + completionBonus),
      weightedScore: Math.round((uniTierResult.score + completionBonus) * 0.25),
      rationale: `${uniTierResult.label} — QS World Rankings${completionNote}`,
      source: completionNote
        ? "QS World University Rankings 2024-25 + US College Scorecard API (live)"
        : "QS World University Rankings 2024-25",
    },
    {
      factor: "Course Demand",
      weight: 0.20,
      rawScore: Math.min(100, blsGrowth.score + onetBonus),
      weightedScore: Math.round((blsGrowth.score + onetBonus) * 0.20),
      rationale: blsGrowth.rationale + onetNote,
      source: growthSource + (onetNote ? " + O*NET v30.2 (live)" : ""),
    },
    {
      factor: "Student Caliber",
      weight: 0.20,
      rawScore: caliber,
      weightedScore: Math.round(caliber * 0.20),
      rationale: `Undergrad: ${tierData.label} | CGPA: ${input.undergradCgpa} | ${input.gmatScore ? "GMAT" : "GRE"}: ${testResult.rationale}`,
      source: "Composite: Institution tier + CGPA + Test scores",
    },
    {
      factor: "Destination Country Employment Rate",
      weight: 0.15,
      rawScore: countryEmployment,
      weightedScore: Math.round(countryEmployment * 0.15),
      rationale: `${countryData.gradEmploymentRate * 100}% graduate employment rate in ${countryData.name}`,
      source: countryData.name === "United Kingdom" ? "HESA Graduate Outcomes Survey 2023"
        : countryData.name === "Canada" ? "Statistics Canada PCEIP 2023"
        : countryData.name === "Australia" ? "QILT Graduate Outcomes Survey 2024"
        : "OECD Education at a Glance 2024",
    },
    {
      factor: "STEM / Visa Advantage",
      weight: 0.10,
      rawScore: stem.score,
      weightedScore: Math.round(stem.score * 0.10),
      rationale: stem.rationale,
      source: "USCIS OPT / PGWP regulations 2024",
    },
    {
      factor: "Work Experience",
      weight: 0.10,
      rawScore: workExp.score,
      weightedScore: Math.round(workExp.score * 0.10),
      rationale: workExp.rationale,
      source: "Internal model",
    },
  ];

  if (natEpAdj !== 0) {
    breakdown.push({
      factor: "Nationality / Visa Adjustment",
      weight: 0,
      rawScore: natEpAdj,
      weightedScore: natEpAdj,
      rationale: `${input.nationality ?? "Indian"} national in ${countryData.name}${natNote}`,
      source: natSource || "Immigration statistics 2024",
    });
  }

  const totalScore = Math.min(100, breakdown.reduce((sum, item) => sum + item.weightedScore, 0));
  const { band, color } = getRiskBand(totalScore);

  const summaries: Record<string, string> = {
    Low: `Strong employability profile. ${countryData.name} graduate employment rate of ${Math.round(countryData.gradEmploymentRate * 100)}% combined with high-demand course and strong university tier suggests low risk of unemployment.`,
    Medium: `Moderate employability. Some factors support employment but there are gaps in either university tier, course demand, or student caliber that warrant monitoring.`,
    High: `Elevated employability risk. Combination of lower-tier institution, moderate course demand, or weak academic profile may result in longer time-to-employment.`,
    "Very High": `High employability risk. Multiple factors — institution rank, course demand, and/or academic profile — are below threshold benchmarks. Enhanced monitoring recommended.`,
  };

  return { score: totalScore, riskBand: band, riskColor: color, breakdown, summary: summaries[band] };
}

// ─── FIP Engine (with live API data) ───────────────────────────────────────

export async function computeFIP(input: AssessmentInput): Promise<FIPResult> {
  const courseData = getCourseData(input.targetCourse);
  const countryData = getCountryData(input.destinationCountry);
  const uniTierResult = getUniversityTierScore(input.destinationUniversity);

  // Get base salary from best available source
  let baseSalary: number;
  let baseSalarySource: string;

  if (input.destinationCountry === "US") {
    // Priority: 1) College Scorecard program-level → 2) H1B LCA → 3) BLS wages → 4) static fallback
    let resolved = false;

    // Try College Scorecard program-level earnings
    try {
      const programData = await getProgramEarnings(input.destinationUniversity, input.targetCourse, input.targetDegree);
      if (programData?.medianEarnings4yr) {
        baseSalary = programData.medianEarnings4yr;
        baseSalarySource = programData.source;
        resolved = true;
      }
    } catch { /* continue to next source */ }

    // Try H1B LCA actual salaries
    if (!resolved) {
      const h1bData = getH1BSalary(input.targetCourse);
      if (h1bData) {
        baseSalary = h1bData.medianSalary;
        baseSalarySource = h1bData.source;
        resolved = true;
      }
    }

    // Try BLS OES wages
    if (!resolved) {
      try {
        const blsData = await getOccupationWages(input.targetCourse);
        if (blsData?.annualMedianWage) {
          baseSalary = blsData.annualMedianWage;
          baseSalarySource = blsData.source;
          resolved = true;
        }
      } catch { /* continue to fallback */ }
    }

    // Static fallback
    if (!resolved!) {
      baseSalary = courseData.usMedianWage;
      baseSalarySource = "Static lookup table (fallback)";
    }
  } else {
    // Non-US: use country-specific graduate earnings data
    const countryEarnings = getCountryEarnings(input.destinationCountry, input.targetCourse);
    if (countryEarnings) {
      baseSalary = countryEarnings.median1yr;
      baseSalarySource = countryEarnings.source;
    } else {
      const salaryMap: Record<string, number> = {
        UK: courseData.ukMedianWage,
        Canada: courseData.caMedianWage,
        Australia: courseData.auMedianWage,
        Germany: courseData.deMedianWage,
        France: courseData.frMedianWage,
        Ireland: courseData.ieMedianWage,
      };
      baseSalary = salaryMap[input.destinationCountry] ?? courseData.usMedianWage;
      baseSalarySource = "Static lookup table (fallback)";
    }
  }

  // Live API: enhance with College Scorecard school-level earnings (US only)
  let schoolEarningsNote = "";
  if (input.destinationCountry === "US") {
    try {
      const schoolData = await getSchoolEarnings(input.destinationUniversity);
      if (schoolData?.medianEarnings10yr) {
        schoolEarningsNote = ` | School 10-yr median: $${schoolData.medianEarnings10yr.toLocaleString()} (College Scorecard)`;
      }
    } catch { /* continue without */ }
  }

  const uniPremium = uniTierResult.tier === "T50" ? 1.22
    : uniTierResult.tier === "T100" ? 1.12
    : uniTierResult.tier === "T200" ? 1.05
    : uniTierResult.tier === "T500" ? 1.00
    : 0.92;

  const degreeMult = degreeMultiplier(input.targetDegree);
  const cityMult = getCityMultiplier(input.destinationCountry, input.targetCity);
  const expPremiumFactor = 1 + (input.workExperienceYears * 0.04);

  const year1 = Math.round(baseSalary! * uniPremium * degreeMult * cityMult * expPremiumFactor);
  const year3 = Math.round(year1 * 1.15);
  const year5 = Math.round(year1 * 1.32);

  const exchangeRate = getExchangeRate(countryData.currency);

  // Build H1B context for breakdown if available
  let h1bNote = "";
  if (input.destinationCountry === "US") {
    const h1bData = getH1BSalary(input.targetCourse);
    if (h1bData) {
      h1bNote = ` | H1B LCA range: $${h1bData.p25Salary.toLocaleString()}–$${h1bData.p75Salary.toLocaleString()} (${h1bData.sampleSize.toLocaleString()} certified applications)`;
    }
  }

  const breakdown: FIPBreakdownItem[] = [
    {
      component: "Base Salary",
      value: baseSalary!,
      type: "base",
      rationale: `${input.targetCourse} median salary in ${countryData.name}${schoolEarningsNote}${h1bNote}`,
      source: baseSalarySource!,
    },
    {
      component: "University Premium",
      value: uniPremium,
      type: "multiplier",
      rationale: `${uniTierResult.label} — alumni earnings premium over median`,
      source: "College Scorecard institutional earnings data + QS rankings correlation",
    },
    {
      component: "Degree Level Premium",
      value: degreeMult,
      type: "multiplier",
      rationale: `${input.targetDegree} earnings premium over Bachelor's`,
      source: "NACE Salary Survey 2024 + BLS Education Earnings Premium",
    },
    {
      component: "City / Metro Adjustment",
      value: cityMult,
      type: "multiplier",
      rationale: `${input.targetCity ?? "National average"} cost-of-market adjustment`,
      source: "BLS Area Wage Survey + Cost of Living Index",
    },
    {
      component: "Prior Experience Premium",
      value: expPremiumFactor,
      type: "multiplier",
      rationale: `${input.workExperienceYears} yr(s) work experience → +${(input.workExperienceYears * 4).toFixed(0)}% salary uplift`,
      source: "Internal model (4% per year of prior experience)",
    },
    {
      component: "Year 3 Growth (+15%)",
      value: 1.15,
      type: "adjustment",
      rationale: "Typical 3-year salary growth in destination market",
      source: "BLS Employment Cost Index + Lightcast wage trends",
    },
    {
      component: "Year 5 Growth (+32%)",
      value: 1.32,
      type: "adjustment",
      rationale: "Cumulative 5-year salary trajectory",
      source: "BLS Employment Cost Index + Lightcast wage trends",
    },
  ];

  const dataSourceMap: Record<string, string> = {
    US: "BLS OES 2024 | College Scorecard API (live) | H1B LCA Disclosures FY2025",
    UK: "HESA LEO Graduate Outcomes 2023 | ONS Labour Market Statistics",
    Canada: "Statistics Canada LFS 2024 | PCEIP",
    Australia: "QILT GOS 2024 | ABS Labour Force Survey",
    Germany: "OECD Education at a Glance 2024 | Bundesagentur fur Arbeit",
    France: "OECD Education at a Glance 2024 | INSEE Employment Survey",
    Ireland: "CSO Ireland Labour Force Survey | IDA Ireland wage benchmarks",
  };

  // Nationality-specific salary adjustment + return scenario
  const fipNatData = getNationalityData(input.nationality ?? "Indian", input.destinationCountry);
  const natSalaryAdj = fipNatData?.salaryAdjustment ?? 1.0;
  const adjYear1 = Math.round(year1 * natSalaryAdj);
  const adjYear3 = Math.round(year3 * natSalaryAdj);
  const adjYear5 = Math.round(year5 * natSalaryAdj);

  if (natSalaryAdj !== 1.0) {
    breakdown.push({
      component: "Nationality Salary Adjustment",
      value: natSalaryAdj,
      type: "multiplier",
      rationale: `${input.nationality ?? "Indian"} nationals earn ~${Math.round((1 - natSalaryAdj) * 100)}% less than domestic graduates on average (visa status, sponsorship constraints)`,
      source: fipNatData?.source ?? "Immigration salary statistics 2024",
    });
  }

  // Return-to-home-country scenario
  const returnMultiplier = getReturnSalaryMultiplier(input.nationality ?? "Indian");
  const returnYear1 = Math.round(adjYear1 * exchangeRate * returnMultiplier);
  const returnYear3 = Math.round(returnYear1 * 1.20);
  const returnYear5 = Math.round(returnYear1 * 1.45);

  let returnProbability = 0.30;
  let returnRationale = "Estimated based on immigration patterns";
  if (input.destinationCountry === "US" && fipNatData?.h1bLotteryProbMasters) {
    const lotteryProb = input.targetDegree?.toUpperCase() === "PHD" ? 0.95 : fipNatData.h1bLotteryProbMasters;
    returnProbability = 1 - (lotteryProb * (fipNatData.employerSponsorshipRate ?? 0.72));
    returnRationale = `H1B lottery ~${Math.round(lotteryProb * 100)}% × sponsorship rate ${Math.round((fipNatData.employerSponsorshipRate ?? 0.72) * 100)}% → ${Math.round((1 - returnProbability) * 100)}% stay-abroad probability`;
  } else if (fipNatData) {
    returnProbability = 1 - (fipNatData.employerSponsorshipRate ?? 0.60);
    returnRationale = `Employer sponsorship rate: ${Math.round((fipNatData.employerSponsorshipRate ?? 0.60) * 100)}% in ${getCountryData(input.destinationCountry).name}`;
  }

  // Visa info
  let visaInfo: FIPResult["visaInfo"] = undefined;
  if (fipNatData) {
    const postStudyMonths = input.isStem
      ? (fipNatData.postStudyWorkMonthsStem ?? 12)
      : (fipNatData.postStudyWorkMonthsNonStem ?? 12);

    visaInfo = {
      visaType: fipNatData.visaType ?? "Student → Work Permit",
      postStudyMonths,
      h1bLotteryProb: fipNatData.h1bLotteryProbMasters ?? undefined,
      sponsorshipRate: fipNatData.employerSponsorshipRate,
      notes: fipNatData.notes ?? "",
      source: fipNatData.source,
    };
  }

  return {
    currency: countryData.currency,
    year1Local: adjYear1,
    year3Local: adjYear3,
    year5Local: adjYear5,
    year1Inr: Math.round(adjYear1 * exchangeRate),
    year3Inr: Math.round(adjYear3 * exchangeRate),
    year5Inr: Math.round(adjYear5 * exchangeRate),
    returnScenario: {
      year1Inr: returnYear1,
      year3Inr: returnYear3,
      year5Inr: returnYear5,
      probability: returnProbability,
      rationale: returnRationale,
    },
    visaInfo,
    breakdown,
    dataSource: dataSourceMap[input.destinationCountry] ?? "OECD Education at a Glance 2024",
  };
}

// ─── Loan-to-Income Analysis ───────────────────────────────────────────────

export function computeLTI(loanAmountInr: number, fipYear1Inr: number, fipYear3Inr: number): LoanToIncomeResult {
  const ratio1yr = loanAmountInr / fipYear1Inr;
  const ratio3yr = loanAmountInr / fipYear3Inr;

  // 10-year loan at ~10% interest
  const monthlyRate = 0.10 / 12;
  const months = 120;
  const monthlyEmi = Math.round(loanAmountInr * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1));
  const monthlyIncome = fipYear1Inr / 12;
  const emiToIncomeRatio = monthlyEmi / monthlyIncome;

  let band: LoanToIncomeResult["band"];
  let bandColor: string;
  let summary: string;

  if (ratio1yr <= 1.5 && emiToIncomeRatio <= 0.25) {
    band = "Green";
    bandColor = "#16a34a";
    summary = `Loan is ${ratio1yr.toFixed(1)}× Year 1 income. EMI/Income ratio of ${(emiToIncomeRatio * 100).toFixed(0)}% is well within comfort zone. Low repayment risk.`;
  } else if (ratio1yr <= 2.5 && emiToIncomeRatio <= 0.40) {
    band = "Yellow";
    bandColor = "#ca8a04";
    summary = `Loan is ${ratio1yr.toFixed(1)}× Year 1 income. EMI/Income ratio of ${(emiToIncomeRatio * 100).toFixed(0)}% is manageable but leaves limited buffer. Monitor for income delays.`;
  } else if (ratio1yr <= 3.5 && emiToIncomeRatio <= 0.55) {
    band = "Orange";
    bandColor = "#ea580c";
    summary = `Loan is ${ratio1yr.toFixed(1)}× Year 1 income. EMI/Income ratio of ${(emiToIncomeRatio * 100).toFixed(0)}% is stretched. Repayment depends heavily on timely employment and income growth.`;
  } else {
    band = "Red";
    bandColor = "#dc2626";
    summary = `Loan is ${ratio1yr.toFixed(1)}× Year 1 income. EMI/Income ratio of ${(emiToIncomeRatio * 100).toFixed(0)}% exceeds comfort threshold. High repayment risk — consider reducing loan amount or requiring co-borrower.`;
  }

  return { loanAmountInr, fipYear1Inr, fipYear3Inr, ratio1yr, ratio3yr, band, bandColor, summary, monthlyEmi, emiToIncomeRatio };
}
