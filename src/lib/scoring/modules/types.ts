/**
 * Shared types for the Framework Jan-2026 scoring modules
 * (§12 Credit, §13 Income Stability, §14 Income Source, §15 Savings,
 *  §4.2 Penalties, §25 Insurance) and the composite engine (§4.1, §5).
 *
 * Each module returns a `ModuleResult` with a 0–10 score, which the
 * composite engine multiplies by its weight to contribute to the
 * 0–100 total weighted score.
 */

export type CoApplicantRelation =
  | "FATHER"
  | "MOTHER"
  | "SPOUSE"
  | "SIBLING"
  | "GUARDIAN";

export type OccupationType =
  | "PRIVATE"
  | "GOVT"
  | "SELF_EMPLOYED"
  | "NOT_WORKING"
  | "RETIRED"
  | "FARMER";

export type DocumentAuthenticityStatus =
  | "VERIFIED"
  | "PARTIAL"
  | "MISMATCH"
  | "FORGERY"
  | "UNVERIFIABLE";

export type AdmissionVisaFlightStatus =
  | "ALL_CONFIRMED"
  | "VISA_IN_PROCESS"
  | "CONDITIONAL"
  | "LIKELY_REJECT"
  | "FAKE";

export type InsuranceBundle =
  | "LIFE_ACC_HEALTH"
  | "LIFE_ACC"
  | "CREDIT_LIFE_ONLY"
  | "DECLINED"
  | "NONE";

export type CompositeDecision = "APPROVE" | "CAUTION" | "REJECT";

export interface CoApplicantInput {
  relation: CoApplicantRelation;
  occupationType: OccupationType;
  cibilScore?: number;
  crifScore?: number;
  annualSalary?: number;
  annualRental?: number;
  annualOther?: number;
  existingEmis?: number[];
}

export interface CreditBlockInput {
  applicantCibilScore?: number;
  applicantCrifScore?: number;
  isNewToCredit: boolean;
  /** Whether this is a Class 12 → UG or UG → immediate PG application (scores 8 under NTC rule). */
  isNtcEligibleTransition?: boolean;
  averageBankBalance3moInr?: number;
  /** Future EMI during study period — used for NTC ABB ≥ 2× EMI check. */
  futureEmiInr?: number;
  coApplicants: CoApplicantInput[];
}

export interface IncomeStabilityInput {
  applicantAnnualSalary?: number;
  applicantAnnualOther?: number;
  applicantExistingEmis?: number[];
  coApplicants: CoApplicantInput[];
  /** Future EMI post-moratorium (single joint obligation) in INR. */
  futureEmiInr: number;
  /** University score from §8 (0–10) — drives FEP 100/50/25% application. */
  universityScore0to10: number;
  /** Monthly disposable income from FEP (if student employs abroad). */
  fepMonthlyDisposableInr: number;
  /** University rank tier for floor selection. */
  universityRankTier: UniversityRankTier;
}

export type UniversityRankTier =
  | "TOP_100"
  | "RANK_101_350"
  | "RANK_351_500"
  | "UNRANKED_REPUTED";

export interface SavingsInput {
  scholarshipInr: number;
  mutualFundInr: number;
  fdInr: number;
  bankSavingsInr: number;
  otherSavingsInr: number;
  totalCostOfAttInr: number;
}

export interface PenaltyFlagsInput {
  creditDefault15PlusDpd: boolean;
  creditDefaultWriteOff: boolean;
  creditOverdueAbove3k: boolean;
  inNegativePincodeList: boolean;
  documentAuthenticityStatus?: DocumentAuthenticityStatus;
  admissionVisaFlightStatus?: AdmissionVisaFlightStatus;
  socialMediaRedFlag: boolean;
  /** Currently weighted 0% per framework, flagged for ops visibility only. */
  earlyEmiBounceHistory?: boolean;
  consultantBlacklistHit?: boolean;
}

export interface InsuranceInput {
  loanAmountInr?: number;
  bundle?: InsuranceBundle;
}

export interface ModuleBreakdownItem {
  label: string;
  value: number | string;
  rationale: string;
}

export interface ModuleResult {
  /** 0–10 scored output. */
  score: number;
  /** Human-readable summary of how the score was produced. */
  rationale: string;
  /** Whether the module hit a hard-reject condition (§13 joint-coverage floor). */
  hardReject?: boolean;
  /** Granular breakdown lines. */
  breakdown: ModuleBreakdownItem[];
}

export interface PenaltyTriggered {
  code: string;
  label: string;
  deductionPct: number;
  triggered: boolean;
}

export interface PenaltyResult {
  totalDeductionPct: number;
  triggered: PenaltyTriggered[];
  allPenalties: PenaltyTriggered[];
}

export interface InsuranceResult {
  flagged: boolean;
  mandatory: boolean;
  rationale: string;
}
