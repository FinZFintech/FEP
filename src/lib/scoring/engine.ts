import type { AssessmentInput, EPResult, FIPResult, EPBreakdownItem, FIPBreakdownItem } from "./types";
import { getSchoolEarnings, getProgramEarnings, getOccupationWages, getOccupationGrowth, getH1BSalary, getOccupationDetails } from "../apis";

import universitiesData from "./lookups/universities.json";
import coursesData from "./lookups/courses.json";
import countriesData from "./lookups/countries.json";
import undergradTiersData from "./lookups/undergrad-tiers.json";

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

  // BLS growth data — currently a static in-process lookup map, NOT a live fetch
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
      // Tier score comes from the embedded QS rankings JSON (static); the completion
      // bonus, when present, is the only part fetched live from College Scorecard.
      source: completionNote
        ? "QS World University Rankings 2024-25 (static) + US College Scorecard API (live)"
        : "QS World University Rankings 2024-25 (static)",
      isLive: false,
    },
    {
      factor: "Course Demand",
      weight: 0.20,
      rawScore: Math.min(100, blsGrowth.score + onetBonus),
      weightedScore: Math.round((blsGrowth.score + onetBonus) * 0.20),
      rationale: blsGrowth.rationale + onetNote,
      source: growthSource + (onetNote ? " + O*NET v30.2 (live)" : ""),
      // Primary value (growth rate) is from a hardcoded BLS map — row is MOCK
      // even when O*NET adds a live bonus. The source string exposes the mix.
      isLive: false,
    },
    {
      factor: "Student Caliber",
      weight: 0.20,
      rawScore: caliber,
      weightedScore: Math.round(caliber * 0.20),
      rationale: `Undergrad: ${tierData.label} | CGPA: ${input.undergradCgpa} | ${input.gmatScore ? "GMAT" : "GRE"}: ${testResult.rationale}`,
      source: "Composite: Institution tier + CGPA + Test scores (static thresholds)",
      isLive: false,
    },
    {
      factor: "Destination Country Employment Rate",
      weight: 0.15,
      rawScore: countryEmployment,
      weightedScore: Math.round(countryEmployment * 0.15),
      rationale: `${countryData.gradEmploymentRate * 100}% graduate employment rate in ${countryData.name}`,
      source: (countryData.name === "United Kingdom" ? "HESA Graduate Outcomes Survey 2023"
        : countryData.name === "Canada" ? "Statistics Canada PCEIP 2023"
        : countryData.name === "Australia" ? "QILT Graduate Outcomes Survey 2024"
        : "OECD Education at a Glance 2024") + " (static lookup)",
      isLive: false,
    },
    {
      factor: "STEM / Visa Advantage",
      weight: 0.10,
      rawScore: stem.score,
      weightedScore: Math.round(stem.score * 0.10),
      rationale: stem.rationale,
      source: "USCIS OPT / PGWP regulations 2024 (static)",
      isLive: false,
    },
    {
      factor: "Work Experience",
      weight: 0.10,
      rawScore: workExp.score,
      weightedScore: Math.round(workExp.score * 0.10),
      rationale: workExp.rationale,
      source: "Internal model (static)",
      isLive: false,
    },
  ];

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
  let baseSalaryIsLive = false;

  if (input.destinationCountry === "US") {
    // Priority: 1) College Scorecard program-level → 2) H1B LCA → 3) BLS wages → 4) static fallback
    let resolved = false;

    // Try College Scorecard program-level earnings (LIVE API)
    try {
      const programData = await getProgramEarnings(input.destinationUniversity, input.targetCourse, input.targetDegree);
      if (programData?.medianEarnings4yr) {
        baseSalary = programData.medianEarnings4yr;
        baseSalarySource = programData.source;
        baseSalaryIsLive = true;
        resolved = true;
      }
    } catch { /* continue to next source */ }

    // Try H1B LCA actual salaries (STATIC — hardcoded table in h1b.ts)
    if (!resolved) {
      const h1bData = getH1BSalary(input.targetCourse);
      if (h1bData) {
        baseSalary = h1bData.medianSalary;
        baseSalarySource = h1bData.source + " (static lookup)";
        resolved = true;
      }
    }

    // Try BLS OES wages (LIVE API)
    if (!resolved) {
      try {
        const blsData = await getOccupationWages(input.targetCourse);
        if (blsData?.annualMedianWage) {
          baseSalary = blsData.annualMedianWage;
          baseSalarySource = blsData.source;
          baseSalaryIsLive = true;
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
    // Non-US: use static data for now, label the source
    const salaryMap: Record<string, number> = {
      UK: courseData.ukMedianWage,
      Canada: courseData.caMedianWage,
      Australia: courseData.auMedianWage,
      Germany: courseData.deMedianWage,
      France: courseData.frMedianWage,
      Ireland: courseData.ieMedianWage,
    };
    baseSalary = salaryMap[input.destinationCountry] ?? courseData.usMedianWage;

    const sourceMap: Record<string, string> = {
      UK: "HESA LEO Graduate Outcomes 2023 + ONS Labour Market Statistics (static)",
      Canada: "Statistics Canada Labour Force Survey 2024 (static)",
      Australia: "QILT Graduate Outcomes Survey 2024 + ABS Labour Force (static)",
      Germany: "OECD Education at a Glance 2024 + Bundesagentur fur Arbeit (static)",
      France: "OECD Education at a Glance 2024 + INSEE Employment Survey (static)",
      Ireland: "CSO Ireland Labour Force Survey + IDA Ireland wage benchmarks (static)",
    };
    baseSalarySource = sourceMap[input.destinationCountry] ?? "OECD Education at a Glance 2024 (static)";
  }

  // Live API: enhance with College Scorecard school-level earnings (US only)
  let schoolEarningsNote = "";
  let schoolEarningsLive = false;
  if (input.destinationCountry === "US") {
    try {
      const schoolData = await getSchoolEarnings(input.destinationUniversity);
      if (schoolData?.medianEarnings10yr) {
        schoolEarningsNote = ` | School 10-yr median: $${schoolData.medianEarnings10yr.toLocaleString()} (College Scorecard)`;
        schoolEarningsLive = true;
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
      // Only truly live when the base salary itself came from an API OR when
      // we were able to layer on live school earnings.
      isLive: baseSalaryIsLive || schoolEarningsLive,
    },
    {
      component: "University Premium",
      value: uniPremium,
      type: "multiplier",
      rationale: `${uniTierResult.label} — alumni earnings premium over median`,
      source: "QS tier → hardcoded multiplier table (static)",
      isLive: false,
    },
    {
      component: "Degree Level Premium",
      value: degreeMult,
      type: "multiplier",
      rationale: `${input.targetDegree} earnings premium over Bachelor's`,
      source: "Hardcoded degree multiplier (static)",
      isLive: false,
    },
    {
      component: "City / Metro Adjustment",
      value: cityMult,
      type: "multiplier",
      rationale: `${input.targetCity ?? "National average"} cost-of-market adjustment`,
      source: "Hardcoded city multipliers in countries.json (static)",
      isLive: false,
    },
    {
      component: "Prior Experience Premium",
      value: expPremiumFactor,
      type: "multiplier",
      rationale: `${input.workExperienceYears} yr(s) work experience → +${(input.workExperienceYears * 4).toFixed(0)}% salary uplift`,
      source: "Internal model — 4% per year (static)",
      isLive: false,
    },
    {
      component: "Year 3 Growth (+15%)",
      value: 1.15,
      type: "adjustment",
      rationale: "Typical 3-year salary growth in destination market",
      source: "Hardcoded growth factor (static)",
      isLive: false,
    },
    {
      component: "Year 5 Growth (+32%)",
      value: 1.32,
      type: "adjustment",
      rationale: "Cumulative 5-year salary trajectory",
      source: "Hardcoded growth factor (static)",
      isLive: false,
    },
  ];

  const dataSourceMap: Record<string, string> = {
    US: "BLS OES (live when reachable) | College Scorecard API (live when reachable) | H1B LCA Disclosures FY2025 (static) | Multipliers & city/degree/experience premia (static)",
    UK: "HESA LEO Graduate Outcomes 2023 (static) | ONS Labour Market Statistics (static) | Multipliers (static)",
    Canada: "Statistics Canada LFS 2024 (static) | PCEIP (static) | Multipliers (static)",
    Australia: "QILT GOS 2024 (static) | ABS Labour Force Survey (static) | Multipliers (static)",
    Germany: "OECD Education at a Glance 2024 (static) | Bundesagentur fur Arbeit (static) | Multipliers (static)",
    France: "OECD Education at a Glance 2024 (static) | INSEE Employment Survey (static) | Multipliers (static)",
    Ireland: "CSO Ireland Labour Force Survey (static) | IDA Ireland wage benchmarks (static) | Multipliers (static)",
  };

  return {
    currency: countryData.currency,
    year1Local: year1,
    year3Local: year3,
    year5Local: year5,
    year1Inr: Math.round(year1 * exchangeRate),
    year3Inr: Math.round(year3 * exchangeRate),
    year5Inr: Math.round(year5 * exchangeRate),
    breakdown,
    dataSource: dataSourceMap[input.destinationCountry] ?? "OECD Education at a Glance 2024",
  };
}
