/**
 * Canonical default rule set used by the EP / FIP / LTI scoring engine.
 *
 * Every constant the engine consumes that is *tunable* (weights, thresholds,
 * multipliers, fallback growth factors, band cut-offs) is mirrored here in a
 * single structured object. The Rule Engine page reads this to render the
 * full methodology, and the admin edit screen uses it as the starting point
 * for new versions.
 *
 * If you tweak a number in `src/lib/scoring/engine.ts`, mirror the change
 * here and bump `DEFAULT_RULE_SET_VERSION`.
 */

import { METHODOLOGY_VERSION } from "@/lib/scoring/methodology";

export const DEFAULT_RULE_SET_VERSION = METHODOLOGY_VERSION;

export type DataKind = "live" | "snapshot" | "heuristic";

export interface RuleSourceRef {
  /** Short name of the underlying data source / API. */
  label: string;
  /** Whether this source is fetched live, embedded as a snapshot, or invented. */
  kind: DataKind;
  /** Free-text vintage like "2024-25" or "FY2025 Q1-Q3". */
  vintage?: string;
  /** Optional URL for reviewers to dig into the primary source. */
  url?: string;
  /** Notes on how the source is used inside the engine. */
  notes?: string;
}

export interface BandRule {
  /** Inclusive lower bound on the input metric. Use `null` for "anything below". */
  min: number | null;
  /** Output value (score, multiplier, label, etc.). */
  output: number;
  /** Human-friendly label for this band. */
  label: string;
}

export interface RuleParameters {
  /** Framework Jan-2026 §4.1 / §5 composite scorecard. */
  composite?: {
    weights: {
      destinationRisk: number;
      postStudyVisaRisk: number;
      universityQuality: number;
      academicProfile: number;
      standardisedTests: number;
      workExperience: number;
      creditScore: number;
      incomeStability: number;
      incomeSource: number;
      savings: number;
      futureIncome: number;
    };
    thresholds: {
      approve: number;
      caution: number;
    };
  };
  /** Framework Jan-2026 §12 Credit Score bands. */
  creditScore?: {
    bands: { min: number; score: number; label: string }[];
    bureauBlend: { cibil: number; crif: number };
    ntcTransitionScore: number;
    ntcAbbEmiMultipleMin: number;
  };
  /** Framework Jan-2026 §13 Income Stability. */
  incomeStability?: {
    defaultFoir: number;
    fepApplicationByUniversityScore: { score: number; pct: number }[];
  };
  /** Framework Jan-2026 §14 Income Source. */
  incomeSource?: {
    occupationScores: Record<string, number>;
    parentBlend: { father: number; mother: number };
  };
  /** Framework Jan-2026 §15 Savings / skin-in-the-game. */
  savings?: {
    bands: { minPct: number; score: number; label: string }[];
  };
  /** Framework Jan-2026 §16 Future Income band mapping. */
  futureIncomeBand?: {
    foir: number;
    bands: { minInr: number; score: number; label: string }[];
  };
  /** Framework Jan-2026 §4.2 Penalty Triggers. */
  penalties?: {
    creditDefault15PlusDpd: number;
    creditDefaultWriteOff: number;
    creditOverdueAbove3k: number;
    geoFraudNegativePincode: number;
    documentAuthenticityFail: number;
    admissionVisaFlightNotVerified: number;
    socialMediaRedFlag: number;
    maxTotalDeductionPct: number;
  };
  /** Framework Jan-2026 §25 Insurance. */
  insurance?: {
    mandatoryThresholdInr: number;
  };
  ep: {
    weights: {
      universityTier: number;
      courseDemand: number;
      studentCaliber: number;
      countryEmployment: number;
      stemVisaAdvantage: number;
      workExperience: number;
    };
    caliberCompositeWeights: {
      undergradTier: number;
      cgpaVsBaseline: number;
      greGmat: number;
    };
    riskBands: {
      low: number;
      medium: number;
      high: number;
    };
    greBands: BandRule[];
    gmatBands: BandRule[];
    workExperienceBands: BandRule[];
    blsGrowthBands: BandRule[];
    stemVisaScores: {
      usStem: number;
      canadaStem: number;
      germanyOrIrelandStem: number;
      otherStem: number;
      nonStem: number;
    };
    bonuses: {
      onetBrightOutlook: number;
      collegeScorecardCompletion90: number;
      collegeScorecardCompletion70: number;
    };
  };
  fip: {
    universityTierMultipliers: {
      T50: number;
      T100: number;
      T200: number;
      T500: number;
      UNRANKED: number;
    };
    degreeMultipliers: {
      PHD: number;
      MBA: number;
      MS: number;
      LLM: number;
      MFA: number;
      DEFAULT: number;
    };
    workExperiencePremiumPerYear: number;
    fallbackGrowth: {
      year3: number;
      year5: number;
    };
    returnScenario: {
      year3Growth: number;
      year5Growth: number;
      defaultProbability: number;
      defaultSalaryMultiplier: number;
    };
  };
  lti: {
    bands: {
      green: { maxLoanToYear1: number; maxEmiToIncome: number };
      yellow: { maxLoanToYear1: number; maxEmiToIncome: number };
      orange: { maxLoanToYear1: number; maxEmiToIncome: number };
    };
    loanInterestRate: number;
    loanTenorMonths: number;
  };
}

export const DEFAULT_RULE_PARAMETERS: RuleParameters = {
  composite: {
    weights: {
      destinationRisk: 0.04,
      postStudyVisaRisk: 0.06,
      universityQuality: 0.15,
      academicProfile: 0.15,
      standardisedTests: 0.05,
      workExperience: 0.04,
      creditScore: 0.12,
      incomeStability: 0.08,
      incomeSource: 0.04,
      savings: 0.05,
      futureIncome: 0.22,
    },
    thresholds: { approve: 80, caution: 65 },
  },
  creditScore: {
    bands: [
      { min: 751, score: 10, label: "Excellent (>750)" },
      { min: 700, score: 8,  label: "Strong (700–750)" },
      { min: 650, score: 6,  label: "Fair (650–699)" },
      { min: 1,   score: 3,  label: "Weak (<650)" },
      { min: 0,   score: 0,  label: "No score / negative history" },
    ],
    bureauBlend: { cibil: 0.5, crif: 0.5 },
    ntcTransitionScore: 8,
    ntcAbbEmiMultipleMin: 2,
  },
  incomeStability: {
    defaultFoir: 0.5,
    fepApplicationByUniversityScore: [
      { score: 10, pct: 1.0 },
      { score: 8,  pct: 0.5 },
      { score: 6,  pct: 0.25 },
    ],
  },
  incomeSource: {
    occupationScores: {
      PRIVATE: 10,
      GOVT: 7,
      SELF_EMPLOYED: 5,
      FARMER: 5,
      RETIRED: 6,
      NOT_WORKING: 0,
    },
    parentBlend: { father: 0.6, mother: 0.4 },
  },
  savings: {
    bands: [
      { minPct: 0.50, score: 10, label: ">50% of COA" },
      { minPct: 0.40, score: 8,  label: ">40% of COA" },
      { minPct: 0.30, score: 6,  label: ">30% of COA" },
      { minPct: 0.20, score: 4,  label: ">20% of COA" },
      { minPct: 0.10, score: 2,  label: ">10% of COA" },
      { minPct: 0.00, score: 0,  label: "≤10% of COA" },
    ],
  },
  futureIncomeBand: {
    foir: 0.5,
    bands: [
      { minInr: 150_000, score: 10, label: "> ₹1.5L / mo" },
      { minInr: 100_000, score: 7,  label: "₹1L – ₹1.5L / mo" },
      { minInr: 75_000,  score: 4,  label: "₹75K – ₹1L / mo" },
      { minInr: 0,       score: 0,  label: "< ₹75K / mo" },
    ],
  },
  penalties: {
    creditDefault15PlusDpd: 0.10,
    creditDefaultWriteOff: 0.20,
    creditOverdueAbove3k: 0.05,
    geoFraudNegativePincode: 0.20,
    documentAuthenticityFail: 0.25,
    admissionVisaFlightNotVerified: 0.10,
    socialMediaRedFlag: 0.10,
    maxTotalDeductionPct: 1.0,
  },
  insurance: {
    mandatoryThresholdInr: 2_000_000,
  },
  ep: {
    weights: {
      universityTier: 0.25,
      courseDemand: 0.20,
      studentCaliber: 0.20,
      countryEmployment: 0.15,
      stemVisaAdvantage: 0.10,
      workExperience: 0.10,
    },
    caliberCompositeWeights: {
      undergradTier: 0.50,
      cgpaVsBaseline: 0.35,
      greGmat: 0.15,
    },
    riskBands: {
      low: 75,
      medium: 60,
      high: 45,
    },
    greBands: [
      { min: 325, output: 100, label: "Excellent (≥325)" },
      { min: 315, output: 85,  label: "Strong (315–324)" },
      { min: 305, output: 70,  label: "Good (305–314)" },
      { min: 295, output: 55,  label: "Average (295–304)" },
      { min: null, output: 35, label: "Below average (<295)" },
    ],
    gmatBands: [
      { min: 720, output: 100, label: "Excellent (≥720)" },
      { min: 680, output: 85,  label: "Strong (680–719)" },
      { min: 640, output: 70,  label: "Good (640–679)" },
      { min: 600, output: 55,  label: "Average (600–639)" },
      { min: null, output: 35, label: "Below average (<600)" },
    ],
    workExperienceBands: [
      { min: 5, output: 100, label: "Significant experience (≥5 yr)" },
      { min: 3, output: 80,  label: "Good experience (3–4 yr)" },
      { min: 1, output: 60,  label: "Some experience (1–2 yr)" },
      { min: null, output: 40, label: "Fresh graduate (<1 yr)" },
    ],
    blsGrowthBands: [
      { min: 25, output: 100, label: "Very high demand (≥25%)" },
      { min: 15, output: 88,  label: "High demand (15–24%)" },
      { min: 10, output: 75,  label: "Above-average (10–14%)" },
      { min: 5,  output: 60,  label: "Moderate (5–9%)" },
      { min: 0,  output: 45,  label: "Low (0–4%)" },
      { min: null, output: 20, label: "Declining (<0%)" },
    ],
    stemVisaScores: {
      usStem: 100,
      canadaStem: 95,
      germanyOrIrelandStem: 85,
      otherStem: 75,
      nonStem: 40,
    },
    bonuses: {
      onetBrightOutlook: 5,
      collegeScorecardCompletion90: 5,
      collegeScorecardCompletion70: 3,
    },
  },
  fip: {
    universityTierMultipliers: {
      T50: 1.22,
      T100: 1.12,
      T200: 1.05,
      T500: 1.00,
      UNRANKED: 0.92,
    },
    degreeMultipliers: {
      PHD: 1.10,
      MBA: 1.18,
      MS: 1.05,
      LLM: 1.08,
      MFA: 1.00,
      DEFAULT: 1.05,
    },
    workExperiencePremiumPerYear: 0.04,
    fallbackGrowth: {
      year3: 1.15,
      year5: 1.32,
    },
    returnScenario: {
      year3Growth: 1.20,
      year5Growth: 1.45,
      defaultProbability: 0.30,
      defaultSalaryMultiplier: 0.25,
    },
  },
  lti: {
    bands: {
      green:  { maxLoanToYear1: 1.5, maxEmiToIncome: 0.25 },
      yellow: { maxLoanToYear1: 2.5, maxEmiToIncome: 0.40 },
      orange: { maxLoanToYear1: 3.5, maxEmiToIncome: 0.55 },
    },
    loanInterestRate: 0.10,
    loanTenorMonths: 120,
  },
};

/**
 * Catalog of every external data source / API the engine consumes. Surfaced
 * on the Rule Engine page so reviewers can see which numbers come from where
 * without grepping the codebase.
 */
export const DEFAULT_DATA_SOURCES: RuleSourceRef[] = [
  { label: "QS World University Rankings",   kind: "snapshot", vintage: "2024-25", notes: "University tier mapping (T50/T100/T200/T500/Unranked)." },
  { label: "BLS Occupational Outlook Handbook", kind: "snapshot", vintage: "2024-25", notes: "Embedded fallback for US median wages by course." },
  { label: "BLS OES (Occupational Employment Statistics)", kind: "live", notes: "US base salary by SOC code with P25/P50/P75 distribution." },
  { label: "BLS Employment Projections 2023–2033", kind: "snapshot", vintage: "2023-2033", notes: "10-year employment growth % per occupation, drives EP Course Demand factor." },
  { label: "DOL OFLC H1B LCA Disclosures", kind: "snapshot", vintage: "FY2025 Q1-Q3", notes: "Median + P25/P75 certified wage by occupation, US fallback below Scorecard." },
  { label: "US College Scorecard (program & school earnings)", kind: "live", notes: "Primary US base-salary source; also feeds completion-rate bonus on EP." },
  { label: "US Census ACS 5-yr B20004_006E", kind: "live", notes: "Median earnings of grad/professional degree holders by MSA — drives US city multiplier." },
  { label: "O*NET v30.2", kind: "live", notes: "US-only Bright Outlook flag; +5 bonus on EP Course Demand when set." },
  { label: "FRED CES0500000003", kind: "live", notes: "Total Private hourly earnings — drives US Year-3/Year-5 wage CAGR." },
  { label: "ONS Nomis ASHE NM_30_1 (SOC 2020)", kind: "live", notes: "UK base salary by occupation with median + P25/P75." },
  { label: "ONS KAB9", kind: "live", notes: "UK Average Weekly Earnings — drives UK Year-3/Year-5 wage CAGR." },
  { label: "Statistics Canada 14-10-0063-01", kind: "live", notes: "Canadian wage CAGR for FIP trajectory growth." },
  { label: "Eurostat lc_lci_r2", kind: "live", notes: "Wages component of Labour Cost Index for DE / FR / IE / NL / SE." },
  { label: "ABS WPI", kind: "live", notes: "Australian Wage Price Index — drives AU Year-3/Year-5 wage CAGR." },
  { label: "Frankfurter (ECB FX)", kind: "live", notes: "Live exchange rate to INR for FIP currency conversion." },
  { label: "HESA Graduate Outcomes Survey", kind: "snapshot", vintage: "2023", notes: "UK graduate employment rate." },
  { label: "Statistics Canada PCEIP", kind: "snapshot", vintage: "2023", notes: "Canadian graduate employment rate." },
  { label: "QILT Graduate Outcomes Survey", kind: "snapshot", vintage: "2024", notes: "Australian graduate employment rate." },
  { label: "OECD Education at a Glance", kind: "snapshot", vintage: "2024", notes: "Generic country-level graduate employment fallback." },
  { label: "Internal: nationality salary / sponsorship table", kind: "snapshot", vintage: "2024", notes: "Visa type, OPT/PGWP months, H1B lottery odds, employer sponsorship rates." },
  { label: "Framework Jan-2026 composite scorecard (§4.1, §5)",         kind: "heuristic", vintage: "2026-04", notes: "Re-weighted 11-parameter scorecard; approve ≥80, caution 65–79, reject <65." },
  { label: "Framework Jan-2026 §12 Credit bands (CIBIL / CRIF)",         kind: "heuristic", vintage: "2026-04", notes: "Per-person 0.5/0.5 bureau blend; NTC override scores 8 for Class 12→UG and UG→PG." },
  { label: "Framework Jan-2026 §13 Income Stability joint coverage",     kind: "heuristic", vintage: "2026-04", notes: "FOIR 0.5, rank-tier coverage floors trigger hard-reject below floor." },
  { label: "Framework Jan-2026 §14 Income Source parent blend",          kind: "heuristic", vintage: "2026-04", notes: "Father 0.6 + Mother 0.4, by occupation type." },
  { label: "Framework Jan-2026 §15 Savings / Skin-in-the-game bands",    kind: "heuristic", vintage: "2026-04", notes: "Scholarships + MF + FD + savings as % of COA → 0–10." },
  { label: "Framework Jan-2026 §4.2 Penalty Triggers",                   kind: "heuristic", vintage: "2026-04", notes: "Up to −100% deduction: credit defaults, geo fraud, doc authenticity, admit/visa/flight, social media." },
  { label: "Framework Jan-2026 §25 Insurance policy",                    kind: "heuristic", vintage: "2026-04", notes: "Mandatory bundled life+health cover for loans > ₹20L." },
  { label: "Negative pincode list (placeholder)",                        kind: "heuristic", vintage: "2026-04", notes: "Empty until credit ops supplies the first production list; feeds §20 geo fraud penalty." },
];
