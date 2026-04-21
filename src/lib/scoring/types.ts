export interface AssessmentInput {
  studentName: string;
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

export interface EPBreakdownItem {
  factor: string;
  weight: number;
  rawScore: number;
  weightedScore: number;
  rationale: string;
  source: string;
}

export interface FIPBreakdownItem {
  component: string;
  value: number;
  type: "base" | "multiplier" | "adjustment";
  rationale: string;
  source: string;
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
}
