/// <reference types="node" />
/**
 * Sanity-check for the Framework Jan-2026 composite scoring modules.
 *
 * Runs a set of hand-calibrated profiles through:
 *   - §12 credit-score module
 *   - §13 income-stability module
 *   - §14 income-source module
 *   - §15 savings module
 *   - §4.2 penalties module
 *   - §25 insurance module
 *   - §4.1 composite engine + §5 decisioning
 *
 * Asserts the expected score bands and the decision banner. Exit 0 on
 * success, 1 on any mismatch.
 *
 * Usage:  npx tsx scripts/composite-check.ts
 */

import { computeCreditScore } from "../src/lib/scoring/modules/credit-score";
import { computeIncomeStability, universityScoreToRankTier } from "../src/lib/scoring/modules/income-stability";
import { computeIncomeSource } from "../src/lib/scoring/modules/income-source";
import { computeSavings } from "../src/lib/scoring/modules/savings";
import { computePenalties } from "../src/lib/scoring/modules/penalties";
import { computeInsurance } from "../src/lib/scoring/modules/insurance";
import { computeFutureIncomeBand } from "../src/lib/scoring/modules/future-income-band";
import { computeComposite, DEFAULT_COMPOSITE_PARAMS } from "../src/lib/scoring/composite-engine";
import type { EPResult, FIPResult, AssessmentInput } from "../src/lib/scoring/types";
import type {
  CoApplicantInput,
  CreditBlockInput,
  SavingsInput,
  PenaltyFlagsInput,
  InsuranceInput,
} from "../src/lib/scoring/modules/types";

let failures = 0;
const eq = (actual: unknown, expected: unknown, label: string) => {
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  →  got ${String(actual)}, expected ${String(expected)}`);
  if (!ok) failures++;
};
const closeTo = (actual: number, expected: number, tol: number, label: string) => {
  const ok = Math.abs(actual - expected) <= tol;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  →  got ${actual.toFixed(2)}, expected ≈ ${expected.toFixed(2)} (±${tol})`);
  if (!ok) failures++;
};

console.log("\n=== §12 Credit Score ===");
{
  const r = computeCreditScore({
    applicantCibilScore: 780,
    applicantCrifScore: 780,
    isNewToCredit: false,
    coApplicants: [
      { relation: "FATHER", occupationType: "PRIVATE", cibilScore: 760, crifScore: 720, annualSalary: 1500000 },
      { relation: "MOTHER", occupationType: "GOVT",    cibilScore: 720, crifScore: 700, annualSalary: 800000 },
    ],
  });
  closeTo(r.score, 9.0, 0.6, "Applicant 780/780 + father 760/720 + mother 720/700 (all > 700)");
}
{
  const r = computeCreditScore({
    isNewToCredit: true,
    isNtcEligibleTransition: true,
    averageBankBalance3moInr: 200000,
    futureEmiInr: 50000,
    coApplicants: [],
  });
  eq(r.score, 8, "NTC transition with ABB ≥ 2× EMI → 8");
}
{
  const r = computeCreditScore({
    isNewToCredit: true,
    isNtcEligibleTransition: true,
    averageBankBalance3moInr: 50000,
    futureEmiInr: 50000,
    coApplicants: [],
  });
  eq(r.score < 8, true, "NTC transition with ABB < 2× EMI → below 8");
}

console.log("\n=== §13 Income Stability ===");
{
  const r = computeIncomeStability({
    applicantAnnualSalary: 0,
    applicantAnnualOther: 0,
    applicantExistingEmis: [],
    coApplicants: [
      { relation: "FATHER", occupationType: "PRIVATE", annualSalary: 2400000, existingEmis: [10000] },
      { relation: "MOTHER", occupationType: "GOVT",    annualSalary: 1200000, existingEmis: [] },
    ],
    futureEmiInr: 50000,
    universityScore0to10: 10,
    fepMonthlyDisposableInr: 80000,
    universityRankTier: "TOP_100",
  });
  eq(r.hardReject ?? false, false, "Top-100 uni, strong coverage → not hard-reject");
  eq(r.score >= 8, true, "Top-100 uni, solid parents + FEP → score ≥ 8");
}
{
  const r = computeIncomeStability({
    coApplicants: [{ relation: "FATHER", occupationType: "PRIVATE", annualSalary: 300000 }],
    futureEmiInr: 50000,
    universityScore0to10: 2,
    fepMonthlyDisposableInr: 20000,
    universityRankTier: "UNRANKED_REPUTED",
  });
  eq(r.hardReject, true, "Unranked uni with weak coverage → hardReject triggered");
  eq(r.score, 0, "Hard-reject forces score 0");
}

console.log("\n=== §14 Income Source ===");
{
  const r = computeIncomeSource([
    { relation: "FATHER", occupationType: "PRIVATE" },
    { relation: "MOTHER", occupationType: "GOVT" },
  ]);
  closeTo(r.score, 0.6 * 10 + 0.4 * 7, 0.1, "Father PRIVATE (10) × 0.6 + Mother GOVT (7) × 0.4 = 8.8");
}
{
  const r = computeIncomeSource([{ relation: "FATHER", occupationType: "NOT_WORKING" }]);
  eq(r.score, 0, "Father NOT_WORKING, no mother → 0");
}

console.log("\n=== §15 Savings ===");
{
  const r = computeSavings({
    scholarshipInr: 0,
    mutualFundInr: 500000,
    fdInr: 0,
    bankSavingsInr: 100000,
    otherSavingsInr: 0,
    totalCostOfAttInr: 1000000, // skin = 60% → 10
  } satisfies SavingsInput);
  eq(r.score, 10, "Skin-in-the-game 60% → 10");
}
{
  const r = computeSavings({
    scholarshipInr: 0, mutualFundInr: 0, fdInr: 0, bankSavingsInr: 50000, otherSavingsInr: 0,
    totalCostOfAttInr: 1000000, // 5% → 0
  });
  eq(r.score, 0, "Skin-in-the-game 5% → 0");
}

console.log("\n=== §16 Future Income Band ===");
{
  const r = computeFutureIncomeBand({ fipYear1Inr: 5_000_000 }); // 50L annual × 0.5 / 12 = ~208K/mo
  eq(r.score, 10, "₹50L Y1 → disposable ~₹208K/mo → 10");
}
{
  const r = computeFutureIncomeBand({ fipYear1Inr: 1_200_000 }); // 12L × 0.5 / 12 = 50K/mo
  eq(r.score, 0, "₹12L Y1 → disposable ₹50K/mo → 0");
}

console.log("\n=== §4.2 Penalties ===");
{
  const r = computePenalties({
    creditDefault15PlusDpd: true,                  // -10
    creditDefaultWriteOff: true,                   // -20
    creditOverdueAbove3k: false,
    inNegativePincodeList: true,                   // -20
    documentAuthenticityStatus: "FORGERY",         // -25
    admissionVisaFlightStatus: "CONDITIONAL",      // -10
    socialMediaRedFlag: true,                      // -10
  } satisfies PenaltyFlagsInput);
  closeTo(r.totalDeductionPct, 0.95, 0.01, "Stacked penalties sum to 95% (capped at 100%)");
}
{
  const r = computePenalties({
    creditDefault15PlusDpd: false,
    creditDefaultWriteOff: false,
    creditOverdueAbove3k: false,
    inNegativePincodeList: false,
    documentAuthenticityStatus: "VERIFIED",
    admissionVisaFlightStatus: "ALL_CONFIRMED",
    socialMediaRedFlag: false,
  });
  eq(r.totalDeductionPct, 0, "Clean case → 0% deduction");
}

console.log("\n=== §25 Insurance ===");
{
  const r = computeInsurance({ loanAmountInr: 2_500_000, bundle: "LIFE_ACC_HEALTH" } satisfies InsuranceInput);
  eq(r.mandatory, true, "Loan > ₹20L ⇒ mandatory");
  eq(r.flagged, false, "Bundled life+health ⇒ no flag");
}
{
  const r = computeInsurance({ loanAmountInr: 2_500_000, bundle: "CREDIT_LIFE_ONLY" });
  eq(r.flagged, true, "Loan > ₹20L without bundled ⇒ flagged");
}
{
  const r = computeInsurance({ loanAmountInr: 500_000, bundle: "NONE" });
  eq(r.mandatory, false, "Loan ≤ ₹20L ⇒ not mandatory");
}

console.log("\n=== universityScoreToRankTier ===");
eq(universityScoreToRankTier(10), "TOP_100", "10 → TOP_100");
eq(universityScoreToRankTier(8),  "RANK_101_350", "8 → RANK_101_350");
eq(universityScoreToRankTier(5),  "RANK_351_500", "5 → RANK_351_500");
eq(universityScoreToRankTier(2),  "UNRANKED_REPUTED", "2 → UNRANKED_REPUTED");

console.log("\n=== §4.1 / §5 Composite integration ===");
{
  // Fake EP + FIP results shaped like the real outputs.
  const fakeEp: EPResult = {
    score: 80,
    riskBand: "Low",
    riskColor: "#16a34a",
    summary: "Stub.",
    breakdown: [
      { factor: "Destination University Tier (QS World)", weight: 0.25, rawScore: 85, weightedScore: 21.25, rationale: "", source: "" },
      { factor: "Course Demand (BLS growth)",             weight: 0.20, rawScore: 75, weightedScore: 15,    rationale: "", source: "" },
      { factor: "Student Caliber",                         weight: 0.20, rawScore: 78, weightedScore: 15.6,  rationale: "", source: "" },
      { factor: "Destination Country Employment Rate",     weight: 0.15, rawScore: 80, weightedScore: 12,    rationale: "", source: "" },
      { factor: "STEM / Visa Advantage",                   weight: 0.10, rawScore: 90, weightedScore: 9,     rationale: "", source: "" },
      { factor: "Work Experience",                         weight: 0.10, rawScore: 60, weightedScore: 6,     rationale: "", source: "" },
    ],
  };
  const fakeFip: FIPResult = {
    currency: "USD",
    year1Local: 90000, year3Local: 110000, year5Local: 130000,
    year1Inr: 7_500_000, year3Inr: 9_200_000, year5Inr: 10_900_000,
    breakdown: [],
    dataSource: "stub",
  };
  const input: AssessmentInput = {
    studentName: "Test Student",
    nationality: "Indian",
    undergradInstitution: "IIT Bombay",
    undergradTier: "IIT",
    undergradDegree: "B.Tech",
    undergradMajor: "Computer Science",
    undergradCgpa: 8.5,
    greScore: 325,
    workExperienceYears: 2,
    destinationCountry: "US",
    destinationUniversity: "Carnegie Mellon University",
    targetDegree: "MS",
    targetCourse: "Computer Science",
    isStem: true,
    programDurationMonths: 24,
    loanAmountInr: 3_000_000,
  };
  const creditBlock: CreditBlockInput = {
    applicantCibilScore: 780,
    applicantCrifScore: 780,
    isNewToCredit: false,
    futureEmiInr: 40000,
    coApplicants: [],
  };
  const coApps: CoApplicantInput[] = [
    { relation: "FATHER", occupationType: "PRIVATE", cibilScore: 760, crifScore: 750, annualSalary: 2400000, existingEmis: [15000] },
    { relation: "MOTHER", occupationType: "GOVT",    cibilScore: 720, crifScore: 720, annualSalary: 1200000 },
  ];
  const savings: SavingsInput = {
    scholarshipInr: 0, mutualFundInr: 1_000_000, fdInr: 500_000, bankSavingsInr: 200_000, otherSavingsInr: 0,
    totalCostOfAttInr: 5_000_000,
  };
  const penalties: PenaltyFlagsInput = {
    creditDefault15PlusDpd: false, creditDefaultWriteOff: false, creditOverdueAbove3k: false,
    inNegativePincodeList: false, documentAuthenticityStatus: "VERIFIED",
    admissionVisaFlightStatus: "ALL_CONFIRMED", socialMediaRedFlag: false,
  };
  const insurance: InsuranceInput = { loanAmountInr: 3_000_000, bundle: "LIFE_ACC_HEALTH" };

  const r = computeComposite(input, fakeEp, fakeFip, {
    credit: { ...creditBlock, coApplicants: coApps },
    coApplicants: coApps,
    applicantIncome: { annualSalary: 0, existingEmis: [] },
    savings, penalties, insurance,
    futureEmiInr: 40000,
  });
  console.log(`     composite score = ${r.compositeScore.toFixed(1)} / 100, decision = ${r.decision}`);
  eq(r.penaltyDeductionPct, 0, "Clean case ⇒ no deductions");
  eq(r.hardReject?.triggered ?? false, false, "Strong coverage ⇒ no hard-reject");
  eq(r.decision === "APPROVE" || r.decision === "CAUTION", true, "Strong case ⇒ APPROVE or CAUTION (not REJECT)");
  const weightSum = Object.values(DEFAULT_COMPOSITE_PARAMS.weights).reduce((a, b) => a + b, 0);
  closeTo(weightSum, 1.0, 0.001, "Composite weights sum to 1.0");
}

console.log(`\n=== Summary ===`);
console.log(`Failures: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
