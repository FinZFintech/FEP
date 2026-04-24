/**
 * Framework §4.1 + §5 — Composite scorecard engine.
 *
 * Combines EP sub-components + FIP-derived future-income band + the four
 * co-applicant / credit / savings modules, subtracts §4.2 penalty deductions,
 * and applies the §5 approval thresholds.
 *
 * Weights (re-weighted from the framework's 100% distribution to reflect
 * FEP's stronger FIP pipeline and the empirical weight of credit / income
 * stability in Indian education-loan NPAs; see FEP re-weighting table in
 * the Jan-2026 rollout note):
 *
 *   Destination Risk           4%
 *   Post-Study Visa Risk       6%
 *   University Quality        15%
 *   Academic Profile          15%
 *   Standardised Tests         5%
 *   Work Experience            4%
 *   Credit Score              12%
 *   Income Stability           8%
 *   Income Source              4%
 *   Savings                    5%
 *   Future Income             22%
 *   ────────────────────────────
 *   Total                    100%
 */

import type { AssessmentInput, EPResult, FIPResult } from "./types";
import {
  computeCreditScore,
  DEFAULT_CREDIT_SCORE_PARAMS,
} from "./modules/credit-score";
import {
  computeIncomeStability,
  universityScoreToRankTier,
  DEFAULT_INCOME_STABILITY_PARAMS,
} from "./modules/income-stability";
import {
  computeIncomeSource,
  DEFAULT_INCOME_SOURCE_PARAMS,
} from "./modules/income-source";
import {
  computeSavings,
  DEFAULT_SAVINGS_PARAMS,
} from "./modules/savings";
import {
  computePenalties,
  DEFAULT_PENALTY_PARAMS,
} from "./modules/penalties";
import {
  computeInsurance,
  DEFAULT_INSURANCE_PARAMS,
} from "./modules/insurance";
import {
  computeFutureIncomeBand,
  DEFAULT_FUTURE_INCOME_BAND_PARAMS,
} from "./modules/future-income-band";
import type {
  CoApplicantInput,
  CompositeDecision,
  CreditBlockInput,
  InsuranceInput,
  ModuleResult,
  PenaltyFlagsInput,
  PenaltyResult,
  SavingsInput,
} from "./modules/types";

export interface CompositeWeights {
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
}

export interface CompositeThresholds {
  /** Minimum score to auto-approve. */
  approve: number;
  /** Minimum score to fall into "caution / manual review" band. Below ⇒ reject. */
  caution: number;
}

export interface CompositeRuleParams {
  weights: CompositeWeights;
  thresholds: CompositeThresholds;
}

export const DEFAULT_COMPOSITE_PARAMS: CompositeRuleParams = {
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
  thresholds: {
    approve: 80,
    caution: 65,
  },
};

export interface ApplicantIncomeInput {
  annualSalary?: number;
  annualOther?: number;
  existingEmis?: number[];
}

export interface CompositeExtraInput {
  credit: CreditBlockInput;
  coApplicants: CoApplicantInput[];
  /** Applicant-side income used in §13 joint-coverage calculation. */
  applicantIncome?: ApplicantIncomeInput;
  savings: SavingsInput;
  penalties: PenaltyFlagsInput;
  insurance: InsuranceInput;
  /** Future EMI post-moratorium (INR/mo). Also used by §13 joint coverage. */
  futureEmiInr: number;
}

export interface CompositeParameterContribution {
  parameter: string;
  weight: number;
  /** 0–10 score from the module. */
  score: number;
  /** weight × score (out of 10) × 10 = contribution on 0–100 scale. */
  weightedScore: number;
  rationale: string;
}

export interface CompositeResult {
  compositeScore: number;
  decision: CompositeDecision;
  decisionReason: string;
  grossScore: number;
  penaltyDeductionPct: number;
  penalties: PenaltyResult;
  insurance: ReturnType<typeof computeInsurance>;
  parameters: CompositeParameterContribution[];
  modules: {
    credit: ModuleResult;
    incomeStability: ModuleResult;
    incomeSource: ModuleResult;
    savings: ModuleResult;
    futureIncomeBand: ModuleResult & { monthlyDisposableInr: number };
  };
  hardReject?: { triggered: boolean; reason: string };
}

// ─── Helpers to pull EP sub-scores ────────────────────────────────────────

function epFactor(ep: EPResult, factorNameIncludes: string): number {
  const item = ep.breakdown.find((b) =>
    b.factor.toLowerCase().includes(factorNameIncludes.toLowerCase()),
  );
  return item ? item.rawScore : 0;
}

function ep100to10(score100: number): number {
  return Math.round((score100 / 10) * 10) / 10;
}

function greGmatBandScore(input: AssessmentInput): { score0to10: number; rationale: string } {
  // Use GRE if present, else GMAT, else neutral 5/10.
  if (input.greScore !== undefined && input.greScore !== null) {
    const s = input.greScore;
    if (s >= 320) return { score0to10: 10, rationale: `GRE ${s} — Excellent (≥320)` };
    if (s >= 310) return { score0to10: 8,  rationale: `GRE ${s} — Strong (310–319)` };
    if (s >= 300) return { score0to10: 6,  rationale: `GRE ${s} — Good (300–309)` };
    return { score0to10: 4, rationale: `GRE ${s} — Below the 300 floor` };
  }
  if (input.gmatScore !== undefined && input.gmatScore !== null) {
    const s = input.gmatScore;
    if (s >= 700) return { score0to10: 10, rationale: `GMAT ${s} — Excellent (≥700)` };
    if (s >= 650) return { score0to10: 8,  rationale: `GMAT ${s} — Strong (650–699)` };
    if (s >= 600) return { score0to10: 6,  rationale: `GMAT ${s} — Good (600–649)` };
    return { score0to10: 4, rationale: `GMAT ${s} — Below the 600 floor` };
  }
  return { score0to10: 5, rationale: "Neither GRE nor GMAT supplied — neutral 5/10." };
}

function epDestinationRiskScore(ep: EPResult): number {
  // EP Destination Country Employment Rate is the closest analogue to §6.
  return ep100to10(epFactor(ep, "Destination Country"));
}

function epPostStudyVisaScore(ep: EPResult): number {
  return ep100to10(epFactor(ep, "STEM"));
}

function epUniversityScore(ep: EPResult): number {
  return ep100to10(epFactor(ep, "Destination University Tier"));
}

function epAcademicScore(ep: EPResult): number {
  return ep100to10(epFactor(ep, "Student Caliber"));
}

function epWorkExperienceScore(ep: EPResult): number {
  return ep100to10(epFactor(ep, "Work Experience"));
}

// ─── Composite computation ────────────────────────────────────────────────

export function computeComposite(
  input: AssessmentInput,
  ep: EPResult,
  fip: FIPResult,
  extra: CompositeExtraInput,
  params: CompositeRuleParams = DEFAULT_COMPOSITE_PARAMS,
): CompositeResult {
  // 1. EP-derived sub-scores.
  const destinationRisk = epDestinationRiskScore(ep);
  const postStudyVisaRisk = epPostStudyVisaScore(ep);
  const universityScore = epUniversityScore(ep);
  const academicProfile = epAcademicScore(ep);
  const workExperience = epWorkExperienceScore(ep);
  const testBand = greGmatBandScore(input);

  // 2. Future income band from FIP Y1.
  const futureIncomeBand = computeFutureIncomeBand(
    { fipYear1Inr: fip.year1Inr },
    DEFAULT_FUTURE_INCOME_BAND_PARAMS,
  );

  // 3. Framework §12 — credit.
  const creditResult = computeCreditScore(
    { ...extra.credit, coApplicants: extra.coApplicants },
    DEFAULT_CREDIT_SCORE_PARAMS,
  );

  // 4. Framework §13 — income stability (hard-reject floor).
  const universityRankTier = universityScoreToRankTier(universityScore);
  const incomeStabilityResult = computeIncomeStability(
    {
      applicantAnnualSalary: extra.applicantIncome?.annualSalary,
      applicantAnnualOther: extra.applicantIncome?.annualOther,
      applicantExistingEmis: extra.applicantIncome?.existingEmis,
      coApplicants: extra.coApplicants,
      futureEmiInr: extra.futureEmiInr,
      universityScore0to10: universityScore,
      fepMonthlyDisposableInr: futureIncomeBand.monthlyDisposableInr,
      universityRankTier,
    },
    DEFAULT_INCOME_STABILITY_PARAMS,
  );

  // 5. Framework §14 — income source.
  const incomeSourceResult = computeIncomeSource(extra.coApplicants, DEFAULT_INCOME_SOURCE_PARAMS);

  // 6. Framework §15 — savings.
  const savingsResult = computeSavings(extra.savings, DEFAULT_SAVINGS_PARAMS);

  // 7. Framework §4.2 — penalties.
  const penalties = computePenalties(extra.penalties, DEFAULT_PENALTY_PARAMS);

  // 8. Framework §25 — insurance (flag only).
  const insurance = computeInsurance(extra.insurance, DEFAULT_INSURANCE_PARAMS);

  // 9. Compose weighted score (0–100).
  const w = params.weights;
  const parameters: CompositeParameterContribution[] = [
    {
      parameter: "Destination Risk",
      weight: w.destinationRisk,
      score: destinationRisk,
      weightedScore: destinationRisk * w.destinationRisk * 10,
      rationale: `EP country-employment score mapped to 0–10.`,
    },
    {
      parameter: "Post-Study Visa Risk",
      weight: w.postStudyVisaRisk,
      score: postStudyVisaRisk,
      weightedScore: postStudyVisaRisk * w.postStudyVisaRisk * 10,
      rationale: `EP STEM/visa-advantage score mapped to 0–10.`,
    },
    {
      parameter: "University Quality",
      weight: w.universityQuality,
      score: universityScore,
      weightedScore: universityScore * w.universityQuality * 10,
      rationale: `EP university-tier score mapped to 0–10.`,
    },
    {
      parameter: "Academic Profile",
      weight: w.academicProfile,
      score: academicProfile,
      weightedScore: academicProfile * w.academicProfile * 10,
      rationale: `EP student-caliber composite (UG tier + CGPA + GRE/GMAT).`,
    },
    {
      parameter: "Standardised Tests",
      weight: w.standardisedTests,
      score: testBand.score0to10,
      weightedScore: testBand.score0to10 * w.standardisedTests * 10,
      rationale: testBand.rationale,
    },
    {
      parameter: "Work Experience",
      weight: w.workExperience,
      score: workExperience,
      weightedScore: workExperience * w.workExperience * 10,
      rationale: `EP work-experience band mapped to 0–10.`,
    },
    {
      parameter: "Credit Score",
      weight: w.creditScore,
      score: creditResult.score,
      weightedScore: creditResult.score * w.creditScore * 10,
      rationale: creditResult.rationale,
    },
    {
      parameter: "Income Stability",
      weight: w.incomeStability,
      score: incomeStabilityResult.score,
      weightedScore: incomeStabilityResult.score * w.incomeStability * 10,
      rationale: incomeStabilityResult.rationale,
    },
    {
      parameter: "Income Source",
      weight: w.incomeSource,
      score: incomeSourceResult.score,
      weightedScore: incomeSourceResult.score * w.incomeSource * 10,
      rationale: incomeSourceResult.rationale,
    },
    {
      parameter: "Savings",
      weight: w.savings,
      score: savingsResult.score,
      weightedScore: savingsResult.score * w.savings * 10,
      rationale: savingsResult.rationale,
    },
    {
      parameter: "Future Income",
      weight: w.futureIncome,
      score: futureIncomeBand.score,
      weightedScore: futureIncomeBand.score * w.futureIncome * 10,
      rationale: futureIncomeBand.rationale,
    },
  ];

  const grossScore = parameters.reduce((s, p) => s + p.weightedScore, 0);

  // 10. Apply penalty deductions (% of the 0–100 score).
  const penaltyDeductionPct = penalties.totalDeductionPct;
  const afterPenalty = Math.max(0, grossScore * (1 - penaltyDeductionPct));
  const compositeScore = Math.round(afterPenalty * 10) / 10;

  // 11. Decision via §5 thresholds — with hard-reject override from §13.
  let decision: CompositeDecision;
  let decisionReason: string;

  if (incomeStabilityResult.hardReject) {
    decision = "REJECT";
    decisionReason = `Hard reject: ${incomeStabilityResult.rationale}`;
  } else if (compositeScore >= params.thresholds.approve) {
    decision = "APPROVE";
    decisionReason = `Composite score ${compositeScore.toFixed(1)} ≥ approve threshold ${params.thresholds.approve}.`;
  } else if (compositeScore >= params.thresholds.caution) {
    decision = "CAUTION";
    decisionReason = `Composite score ${compositeScore.toFixed(1)} between ${params.thresholds.caution} and ${params.thresholds.approve} — escalate for manual review.`;
  } else {
    decision = "REJECT";
    decisionReason = `Composite score ${compositeScore.toFixed(1)} < caution threshold ${params.thresholds.caution}.`;
  }

  return {
    compositeScore,
    decision,
    decisionReason,
    grossScore: Math.round(grossScore * 10) / 10,
    penaltyDeductionPct,
    penalties,
    insurance,
    parameters,
    modules: {
      credit: creditResult,
      incomeStability: incomeStabilityResult,
      incomeSource: incomeSourceResult,
      savings: savingsResult,
      futureIncomeBand,
    },
    hardReject: incomeStabilityResult.hardReject
      ? { triggered: true, reason: incomeStabilityResult.rationale }
      : undefined,
  };
}
