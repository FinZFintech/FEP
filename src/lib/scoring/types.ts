export interface AssessmentInput {
  studentName: string;
  nationality: string;
  undergradInstitution: string;
  undergradTier: string;
  undergradDegree: string;
  undergradMajor: string;
  undergradCgpa: number;
  greScore?: number;
  gmatScore?: number;
  workExperienceYears: number;
  destinationCountry: string;
  destinationUniversity: string;
  targetDegree: string;
  targetCourse: string;
  isStem: boolean;
  programDurationMonths: number;
  targetCity?: string;
  loanAmountInr?: number;
}

export type DataKind = "live" | "snapshot" | "heuristic";

export interface ConfidenceRange {
  p25: number;
  p75: number;
  sampleSize?: number;
  unit?: string;
}

export interface EPBreakdownItem {
  factor: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  rationale: string;
  source: string;
  dataKind?: DataKind;
  vintage?: string;
  /** ISO timestamp of the live fetch that produced this row. Absent for snapshot/heuristic. */
  fetchedAt?: string;
  isLive?: boolean;
}

export interface FIPBreakdownItem {
  component: string;
  value: number;
  type: "base" | "multiplier" | "adjustment";
  rationale: string;
  source: string;
  dataKind?: DataKind;
  vintage?: string;
  /** ISO timestamp of the live fetch that produced this row. */
  fetchedAt?: string;
  /** Optional P25/P75 band for the underlying distribution (e.g. BLS OES / H1B LCA). */
  confidence?: ConfidenceRange;
  isLive?: boolean;
}

export interface EPResult {
  score: number;
  riskBand: "Low" | "Medium" | "High" | "Very High";
  riskColor: string;
  breakdown: EPBreakdownItem[];
  summary: string;
}

export interface FIPResult {
  currency: string;
  year1Local: number;
  year3Local: number;
  year5Local: number;
  year1Inr: number;
  year3Inr: number;
  year5Inr: number;
  /** P25/P75 on the Year-1 base salary, when the source publishes percentiles. */
  year1LocalConfidence?: ConfidenceRange;
  year1InrConfidence?: ConfidenceRange;
  /** FX rate provenance so INR numbers can carry their own tag. */
  fx?: {
    currency: string;
    inrPerUnit: number;
    source: string;
    dataKind: DataKind;
    vintage?: string;
    fetchedAt?: string;
  };
  returnScenario?: {
    year1Inr: number;
    year3Inr: number;
    year5Inr: number;
    probability: number;
    rationale: string;
  };
  visaInfo?: {
    visaType: string;
    postStudyMonths: number;
    h1bLotteryProb?: number;
    sponsorshipRate: number;
    notes: string;
    source: string;
  };
  breakdown: FIPBreakdownItem[];
  dataSource: string;
}

export interface LoanToIncomeResult {
  loanAmountInr: number;
  fipYear1Inr: number;
  fipYear3Inr: number;
  ratio1yr: number;
  ratio3yr: number;
  band: "Green" | "Yellow" | "Orange" | "Red";
  bandColor: string;
  summary: string;
  monthlyEmi: number;
  emiToIncomeRatio: number;
}

export interface AssessmentResult {
  ep: EPResult;
  fip: FIPResult;
  lti?: LoanToIncomeResult;
  input: AssessmentInput;
  computedAt: string;
  methodologyVersion?: string;
}
