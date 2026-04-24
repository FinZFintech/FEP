"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

type CoApplicantRelation = "FATHER" | "MOTHER" | "SPOUSE" | "SIBLING" | "GUARDIAN";
type OccupationType =
  | "PRIVATE" | "GOVT" | "SELF_EMPLOYED" | "NOT_WORKING" | "RETIRED" | "FARMER";

interface CoApplicantFormState {
  relation: CoApplicantRelation;
  occupationType: OccupationType;
  cibilScore: string;
  crifScore: string;
  annualSalary: string;
  annualRental: string;
  annualOther: string;
  existingEmi1: string;
  existingEmi2: string;
  existingEmi3: string;
}

const EMPTY_COAPP: CoApplicantFormState = {
  relation: "FATHER",
  occupationType: "PRIVATE",
  cibilScore: "",
  crifScore: "",
  annualSalary: "",
  annualRental: "",
  annualOther: "",
  existingEmi1: "",
  existingEmi2: "",
  existingEmi3: "",
};

const CO_APP_RELATIONS: { value: CoApplicantRelation; label: string }[] = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "SPOUSE", label: "Spouse" },
  { value: "SIBLING", label: "Sibling" },
  { value: "GUARDIAN", label: "Guardian" },
];

const OCCUPATION_TYPES: { value: OccupationType; label: string }[] = [
  { value: "PRIVATE", label: "Private Sector Employee" },
  { value: "GOVT", label: "Govt Job" },
  { value: "SELF_EMPLOYED", label: "Self-Employed" },
  { value: "RETIRED", label: "Retired / Pensioner" },
  { value: "FARMER", label: "Farmer" },
  { value: "NOT_WORKING", label: "Not Working" },
];

const DOC_AUTH_STATUSES = [
  { value: "", label: "Not checked yet" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PARTIAL", label: "Partially verified" },
  { value: "MISMATCH", label: "Mismatch — clarified" },
  { value: "FORGERY", label: "Suspected forgery / edits" },
  { value: "UNVERIFIABLE", label: "Unverifiable documents" },
];

const ADMIT_VISA_FLIGHT_STATUSES = [
  { value: "", label: "Not checked yet" },
  { value: "ALL_CONFIRMED", label: "Admit + visa stamped + flight booked" },
  { value: "VISA_IN_PROCESS", label: "Admit + visa in process" },
  { value: "CONDITIONAL", label: "Conditional admit / visa pending" },
  { value: "LIKELY_REJECT", label: "Likely visa rejection" },
  { value: "FAKE", label: "Fake / unverifiable documents" },
];

const INSURANCE_BUNDLES = [
  { value: "", label: "Not captured" },
  { value: "LIFE_ACC_HEALTH", label: "Life + Accidental + Health (bundled)" },
  { value: "LIFE_ACC", label: "Life + Accidental only" },
  { value: "CREDIT_LIFE_ONLY", label: "Basic credit life only" },
  { value: "DECLINED", label: "Declined by customer" },
  { value: "NONE", label: "No insurance" },
];

const COUNTRIES = ["US", "UK", "Canada", "Australia", "Germany", "France", "Ireland", "New Zealand", "Netherlands", "Singapore", "Sweden"];
const NATIONALITIES = [
  { value: "Indian", label: "Indian" },
  { value: "Nepali", label: "Nepali" },
  { value: "Bangladeshi", label: "Bangladeshi" },
  { value: "Sri Lankan", label: "Sri Lankan" },
  { value: "Pakistani", label: "Pakistani" },
];
const UNDERGRAD_TIERS = [
  { value: "IIT", label: "IIT (Indian Institutes of Technology)" },
  { value: "IIM", label: "IIM (Indian Institutes of Management)" },
  { value: "BITS", label: "BITS Pilani / Goa / Hyderabad" },
  { value: "NIT", label: "NIT (National Institutes of Technology)" },
  { value: "IIIT", label: "IIIT (Indian Institutes of IT)" },
  { value: "DELHI_UNIV", label: "Delhi University – Top Colleges" },
  { value: "CENTRAL_UNIV", label: "Central / Top State University" },
  { value: "TIER2_PRIVATE", label: "Tier-2 Private (Manipal, VIT, SRM, etc.)" },
  { value: "STATE_UNIV", label: "State / Deemed University" },
  { value: "OTHERS", label: "Other / Unknown" },
];
const TARGET_DEGREES = ["MS", "MBA", "PhD", "MEng", "MFA", "LLM", "MRes", "PGDip"];
const COURSES = [
  "Artificial Intelligence", "Biotechnology", "Biomedical Engineering",
  "Business Administration", "Chemical Engineering", "Civil Engineering",
  "Cloud Computing", "Computer Science", "Cybersecurity", "Data Science",
  "Economics", "Electrical Engineering", "Finance", "Health Informatics",
  "Human Resources", "Information Systems", "Journalism", "Liberal Arts",
  "Machine Learning", "Marketing", "MBA", "Mechanical Engineering",
  "Public Policy", "Software Engineering", "Supply Chain Management",
];

export interface AssessmentFormInitialData {
  studentName?: string;
  undergradInstitution?: string;
  undergradTier?: string;
  undergradDegree?: string;
  undergradMajor?: string;
  undergradCgpa?: number;
  greScore?: number | null;
  gmatScore?: number | null;
  workExperienceYears?: number;
  destinationCountry?: string;
  destinationUniversity?: string;
  targetDegree?: string;
  targetCourse?: string;
  isStem?: boolean;
  programDurationMonths?: number;
  targetCity?: string | null;
  loanAmountInr?: number | null;
  notes?: string | null;
}

interface FormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
  initialData?: AssessmentFormInitialData;
  submitLabel?: string;
  submittingLabel?: string;
}

export function AssessmentForm({
  onSubmit,
  loading,
  initialData,
  submitLabel = "Run Assessment",
  submittingLabel = "Computing...",
}: FormProps) {
  const [form, setForm] = useState({
    studentName: initialData?.studentName ?? "",
    nationality: "Indian",
    undergradInstitution: initialData?.undergradInstitution ?? "",
    undergradTier: initialData?.undergradTier ?? "NIT",
    undergradDegree: initialData?.undergradDegree ?? "B.Tech",
    undergradMajor: initialData?.undergradMajor ?? "Computer Science",
    undergradCgpa: initialData?.undergradCgpa != null ? String(initialData.undergradCgpa) : "",
    cgpaScale: "10",
    greScore: initialData?.greScore != null ? String(initialData.greScore) : "",
    gmatScore: initialData?.gmatScore != null ? String(initialData.gmatScore) : "",
    workExperienceYears: initialData?.workExperienceYears != null ? String(initialData.workExperienceYears) : "0",
    destinationCountry: initialData?.destinationCountry ?? "US",
    destinationUniversity: initialData?.destinationUniversity ?? "",
    targetDegree: initialData?.targetDegree ?? "MS",
    targetCourse: initialData?.targetCourse ?? "Computer Science",
    isStem: initialData?.isStem ?? true,
    programDurationMonths: initialData?.programDurationMonths != null ? String(initialData.programDurationMonths) : "24",
    targetCity: initialData?.targetCity ?? "",
    loanAmountInr: initialData?.loanAmountInr != null ? String(initialData.loanAmountInr) : "",
    notes: initialData?.notes ?? "",

    // Framework Jan-2026 fields — all optional. Composite score only
    // computes when at least one of these is populated.
    applicantCibilScore: "",
    applicantCrifScore: "",
    applicantAnnualSalary: "",
    applicantAnnualOther: "",
    applicantExistingEmi: "",
    applicantFutureEmiInr: "",
    isNewToCredit: false,
    isNtcEligibleTransition: false,
    averageBankBalance3moInr: "",

    tuitionFeesInr: "",
    livingExpensesInr: "",
    totalCostOfAttInr: "",
    scholarshipInr: "",
    mutualFundInr: "",
    fdInr: "",
    bankSavingsInr: "",
    otherSavingsInr: "",

    addressPincode: "",
    documentAuthenticityStatus: "",
    admissionVisaFlightStatus: "",
    socialMediaRedFlag: false,
    creditDefault15PlusDpd: false,
    creditDefaultWriteOff: false,
    creditOverdueAbove3k: false,
    earlyEmiBounceHistory: false,
    consultantBlacklistHit: false,

    insuranceBundle: "",
  });

  const [coApplicants, setCoApplicants] = useState<CoApplicantFormState[]>([]);

  const [openSection, setOpenSection] = useState<string | null>(null);
  const toggleSection = (key: string) =>
    setOpenSection((cur) => (cur === key ? null : key));

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const updateCoApp = (idx: number, patch: Partial<CoApplicantFormState>) => {
    setCoApplicants((cs) => cs.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };
  const addCoApp = () => {
    if (coApplicants.length >= 3) return;
    setCoApplicants((cs) => [...cs, { ...EMPTY_COAPP }]);
  };
  const removeCoApp = (idx: number) =>
    setCoApplicants((cs) => cs.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cgpa = parseFloat(form.undergradCgpa);
    // Normalise CGPA to 10-point scale for storage
    const normCgpa = form.cgpaScale === "4" ? cgpa : cgpa;

    const numOrUndef = (v: string): number | undefined =>
      v === "" ? undefined : Number(v);
    const num = (v: string): number => (v === "" ? 0 : Number(v));

    const applicantEmis = form.applicantExistingEmi
      ? form.applicantExistingEmi
          .split(",")
          .map((s) => parseFloat(s.trim()))
          .filter((n) => !Number.isNaN(n) && n >= 0)
      : undefined;

    const coApplicantsPayload = coApplicants.map((c) => ({
      relation: c.relation,
      occupationType: c.occupationType,
      cibilScore: numOrUndef(c.cibilScore),
      crifScore: numOrUndef(c.crifScore),
      annualSalary: num(c.annualSalary),
      annualRental: num(c.annualRental),
      annualOther: num(c.annualOther),
      existingEmis: [c.existingEmi1, c.existingEmi2, c.existingEmi3]
        .map((s) => parseFloat(s))
        .filter((n) => !Number.isNaN(n) && n >= 0),
    }));

    onSubmit({
      studentName: form.studentName,
      nationality: form.nationality,
      undergradInstitution: form.undergradInstitution,
      undergradTier: form.undergradTier,
      undergradDegree: form.undergradDegree,
      undergradMajor: form.undergradMajor,
      undergradCgpa: normCgpa,
      greScore: form.greScore ? parseInt(form.greScore) : undefined,
      gmatScore: form.gmatScore ? parseInt(form.gmatScore) : undefined,
      workExperienceYears: parseInt(form.workExperienceYears),
      destinationCountry: form.destinationCountry,
      destinationUniversity: form.destinationUniversity,
      targetDegree: form.targetDegree,
      targetCourse: form.targetCourse,
      isStem: form.isStem,
      programDurationMonths: parseInt(form.programDurationMonths),
      targetCity: form.targetCity || undefined,
      loanAmountInr: form.loanAmountInr ? parseFloat(form.loanAmountInr) : undefined,
      notes: form.notes || undefined,

      // Framework Jan-2026
      applicantCibilScore: numOrUndef(form.applicantCibilScore),
      applicantCrifScore: numOrUndef(form.applicantCrifScore),
      applicantAnnualSalary: numOrUndef(form.applicantAnnualSalary),
      applicantAnnualOther: numOrUndef(form.applicantAnnualOther),
      applicantExistingEmis: applicantEmis,
      applicantFutureEmiInr: numOrUndef(form.applicantFutureEmiInr),
      isNewToCredit: form.isNewToCredit,
      isNtcEligibleTransition: form.isNtcEligibleTransition,
      averageBankBalance3moInr: numOrUndef(form.averageBankBalance3moInr),

      coApplicants: coApplicantsPayload.length ? coApplicantsPayload : undefined,

      tuitionFeesInr: numOrUndef(form.tuitionFeesInr),
      livingExpensesInr: numOrUndef(form.livingExpensesInr),
      totalCostOfAttInr: numOrUndef(form.totalCostOfAttInr),
      scholarshipInr: numOrUndef(form.scholarshipInr),
      mutualFundInr: numOrUndef(form.mutualFundInr),
      fdInr: numOrUndef(form.fdInr),
      bankSavingsInr: numOrUndef(form.bankSavingsInr),
      otherSavingsInr: numOrUndef(form.otherSavingsInr),

      addressPincode: form.addressPincode || undefined,
      documentAuthenticityStatus: form.documentAuthenticityStatus || undefined,
      admissionVisaFlightStatus: form.admissionVisaFlightStatus || undefined,
      socialMediaRedFlag: form.socialMediaRedFlag,
      creditDefault15PlusDpd: form.creditDefault15PlusDpd,
      creditDefaultWriteOff: form.creditDefaultWriteOff,
      creditOverdueAbove3k: form.creditOverdueAbove3k,
      earlyEmiBounceHistory: form.earlyEmiBounceHistory,
      consultantBlacklistHit: form.consultantBlacklistHit,

      insuranceBundle: form.insuranceBundle || undefined,
    });
  };

  const inputClass = "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white";
  const labelClass = "block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student Profile */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
          Student Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Student Name *</label>
            <input className={inputClass} required value={form.studentName}
              onChange={e => set("studentName", e.target.value)} placeholder="e.g. Rahul Sharma" />
          </div>
          <div>
            <label className={labelClass}>Nationality *</label>
            <select className={inputClass} value={form.nationality} onChange={e => set("nationality", e.target.value)}>
              {NATIONALITIES.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Undergrad Institution *</label>
            <input className={inputClass} required value={form.undergradInstitution}
              onChange={e => set("undergradInstitution", e.target.value)} placeholder="e.g. IIT Bombay" />
          </div>
          <div>
            <label className={labelClass}>Institution Tier *</label>
            <select className={inputClass} value={form.undergradTier} onChange={e => set("undergradTier", e.target.value)}>
              {UNDERGRAD_TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Undergrad Degree *</label>
            <input className={inputClass} required value={form.undergradDegree}
              onChange={e => set("undergradDegree", e.target.value)} placeholder="e.g. B.Tech, B.Sc, B.Com" />
          </div>
          <div>
            <label className={labelClass}>Undergrad Major *</label>
            <input className={inputClass} required value={form.undergradMajor}
              onChange={e => set("undergradMajor", e.target.value)} placeholder="e.g. Computer Science" />
          </div>
          <div>
            <label className={labelClass}>CGPA *</label>
            <div className="flex gap-2">
              <input className={cn(inputClass, "flex-1")} required type="number" min="0" max="10" step="0.01"
                value={form.undergradCgpa} onChange={e => set("undergradCgpa", e.target.value)} placeholder="e.g. 8.5" />
              <select className={cn(inputClass, "w-24")} value={form.cgpaScale} onChange={e => set("cgpaScale", e.target.value)}>
                <option value="10">/ 10</option>
                <option value="4">/ 4.0</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>GRE Score (optional)</label>
            <input className={inputClass} type="number" min="260" max="340"
              value={form.greScore} onChange={e => set("greScore", e.target.value)} placeholder="e.g. 320" />
          </div>
          <div>
            <label className={labelClass}>GMAT Score (optional)</label>
            <input className={inputClass} type="number" min="200" max="800"
              value={form.gmatScore} onChange={e => set("gmatScore", e.target.value)} placeholder="e.g. 680" />
          </div>
          <div>
            <label className={labelClass}>Work Experience (years)</label>
            <select className={inputClass} value={form.workExperienceYears} onChange={e => set("workExperienceYears", e.target.value)}>
              {[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n} {n === 1 ? "year" : "years"}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Target Programme */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
          Target Programme
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Destination Country *</label>
            <select className={inputClass} value={form.destinationCountry} onChange={e => set("destinationCountry", e.target.value)}>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Destination University *</label>
            <input className={inputClass} required value={form.destinationUniversity}
              onChange={e => set("destinationUniversity", e.target.value)} placeholder="e.g. Northeastern University" />
          </div>
          <div>
            <label className={labelClass}>Target Degree *</label>
            <select className={inputClass} value={form.targetDegree} onChange={e => set("targetDegree", e.target.value)}>
              {TARGET_DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Target Course / Field *</label>
            <select className={inputClass} value={form.targetCourse} onChange={e => set("targetCourse", e.target.value)}>
              {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Target City (optional)</label>
            <input className={inputClass} value={form.targetCity}
              onChange={e => set("targetCity", e.target.value)} placeholder="e.g. New York, London" />
          </div>
          <div>
            <label className={labelClass}>Programme Duration</label>
            <select className={inputClass} value={form.programDurationMonths} onChange={e => set("programDurationMonths", e.target.value)}>
              <option value="12">12 months (1 year)</option>
              <option value="18">18 months</option>
              <option value="24">24 months (2 years)</option>
              <option value="36">36 months (3 years)</option>
              <option value="48">48 months (PhD / 4 years)</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <input type="checkbox" id="isStem" className="w-4 h-4 rounded border-slate-300 text-blue-600"
              checked={form.isStem} onChange={e => set("isStem", e.target.checked)} />
            <label htmlFor="isStem" className="text-sm font-medium text-slate-700">
              STEM-designated programme
            </label>
          </div>
        </div>
      </section>

      {/* Loan Details */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
          Loan Details (optional)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Loan Amount (INR)</label>
            <input className={inputClass} type="number" min="0"
              value={form.loanAmountInr} onChange={e => set("loanAmountInr", e.target.value)} placeholder="e.g. 5000000" />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Notes / Comments</label>
            <textarea className={cn(inputClass, "resize-none h-20")}
              value={form.notes} onChange={e => set("notes", e.target.value)}
              placeholder="Any additional context for this assessment..." />
          </div>
        </div>
      </section>

      {/* Framework Jan-2026 — Composite inputs (collapsible) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">4</span>
          Underwriting Inputs — Framework Jan-2026 <span className="text-xs font-normal text-slate-500">(optional)</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Populate these to get a composite 0–100 risk score with approve / caution / reject decision.
          Leave blank to skip and only run EP + FIP.
        </p>

        {/* Applicant credit + NTC */}
        <Collapsible
          title="Applicant Credit & Income (§12 / §13)"
          open={openSection === "credit"}
          onToggle={() => toggleSection("credit")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>CIBIL Score</label>
              <input className={inputClass} type="number" min="0" max="900"
                value={form.applicantCibilScore}
                onChange={e => set("applicantCibilScore", e.target.value)}
                placeholder="e.g. 760" />
            </div>
            <div>
              <label className={labelClass}>CRIF Score</label>
              <input className={inputClass} type="number" min="0" max="900"
                value={form.applicantCrifScore}
                onChange={e => set("applicantCrifScore", e.target.value)}
                placeholder="e.g. 770" />
            </div>
            <div>
              <label className={labelClass}>Annual Salary (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.applicantAnnualSalary}
                onChange={e => set("applicantAnnualSalary", e.target.value)}
                placeholder="e.g. 1200000" />
            </div>
            <div>
              <label className={labelClass}>Annual Other Income (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.applicantAnnualOther}
                onChange={e => set("applicantAnnualOther", e.target.value)}
                placeholder="e.g. 0" />
            </div>
            <div>
              <label className={labelClass}>Existing EMIs (INR/mo, comma-separated)</label>
              <input className={inputClass} type="text"
                value={form.applicantExistingEmi}
                onChange={e => set("applicantExistingEmi", e.target.value)}
                placeholder="e.g. 12000, 8000" />
            </div>
            <div>
              <label className={labelClass}>Future EMI Post-Moratorium (INR/mo)</label>
              <input className={inputClass} type="number" min="0"
                value={form.applicantFutureEmiInr}
                onChange={e => set("applicantFutureEmiInr", e.target.value)}
                placeholder="e.g. 45000" />
            </div>
            <div>
              <label className={labelClass}>Avg. Bank Balance (last 3 months, INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.averageBankBalance3moInr}
                onChange={e => set("averageBankBalance3moInr", e.target.value)}
                placeholder="e.g. 250000" />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <input type="checkbox" id="isNtc"
                className="w-4 h-4 rounded border-slate-300 text-amber-600"
                checked={form.isNewToCredit}
                onChange={e => set("isNewToCredit", e.target.checked)} />
              <label htmlFor="isNtc" className="text-sm font-medium text-slate-700">
                New to Credit (NTC)
              </label>
            </div>
            {form.isNewToCredit && (
              <div className="flex items-center gap-3 pt-5">
                <input type="checkbox" id="isNtcEligible"
                  className="w-4 h-4 rounded border-slate-300 text-amber-600"
                  checked={form.isNtcEligibleTransition}
                  onChange={e => set("isNtcEligibleTransition", e.target.checked)} />
                <label htmlFor="isNtcEligible" className="text-sm font-medium text-slate-700">
                  Class 12 → UG or UG → immediate PG transition
                </label>
              </div>
            )}
          </div>
        </Collapsible>

        {/* Co-applicants */}
        <Collapsible
          title={`Co-Applicants (${coApplicants.length} / 3) — §13 / §14`}
          open={openSection === "coapps"}
          onToggle={() => toggleSection("coapps")}
        >
          {coApplicants.length === 0 && (
            <p className="text-sm text-slate-500 mb-3">
              No co-applicants added. The framework expects at least a father/mother
              for joint-coverage scoring.
            </p>
          )}
          {coApplicants.map((c, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-4 mb-3 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-slate-700">Co-applicant {i + 1}</span>
                <button type="button" onClick={() => removeCoApp(i)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium">
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Relation</label>
                  <select className={inputClass} value={c.relation}
                    onChange={e => updateCoApp(i, { relation: e.target.value as CoApplicantRelation })}>
                    {CO_APP_RELATIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Occupation</label>
                  <select className={inputClass} value={c.occupationType}
                    onChange={e => updateCoApp(i, { occupationType: e.target.value as OccupationType })}>
                    {OCCUPATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>CIBIL</label>
                  <input className={inputClass} type="number" min="0" max="900" value={c.cibilScore}
                    onChange={e => updateCoApp(i, { cibilScore: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>CRIF</label>
                  <input className={inputClass} type="number" min="0" max="900" value={c.crifScore}
                    onChange={e => updateCoApp(i, { crifScore: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Annual Salary (INR)</label>
                  <input className={inputClass} type="number" min="0" value={c.annualSalary}
                    onChange={e => updateCoApp(i, { annualSalary: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Annual Rental (INR)</label>
                  <input className={inputClass} type="number" min="0" value={c.annualRental}
                    onChange={e => updateCoApp(i, { annualRental: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Annual Other (INR)</label>
                  <input className={inputClass} type="number" min="0" value={c.annualOther}
                    onChange={e => updateCoApp(i, { annualOther: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>Existing EMIs (up to 3, INR/mo)</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputClass} type="number" min="0" value={c.existingEmi1}
                      onChange={e => updateCoApp(i, { existingEmi1: e.target.value })} placeholder="EMI 1" />
                    <input className={inputClass} type="number" min="0" value={c.existingEmi2}
                      onChange={e => updateCoApp(i, { existingEmi2: e.target.value })} placeholder="EMI 2" />
                    <input className={inputClass} type="number" min="0" value={c.existingEmi3}
                      onChange={e => updateCoApp(i, { existingEmi3: e.target.value })} placeholder="EMI 3" />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {coApplicants.length < 3 && (
            <button type="button" onClick={addCoApp}
              className="text-sm font-medium text-blue-600 hover:text-blue-700">
              + Add Co-Applicant
            </button>
          )}
        </Collapsible>

        {/* Savings / skin in the game */}
        <Collapsible
          title="Savings & Skin-in-the-game (§15)"
          open={openSection === "savings"}
          onToggle={() => toggleSection("savings")}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Tuition Fees (INR, course total)</label>
              <input className={inputClass} type="number" min="0"
                value={form.tuitionFeesInr}
                onChange={e => set("tuitionFeesInr", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Living Expenses (INR, course total)</label>
              <input className={inputClass} type="number" min="0"
                value={form.livingExpensesInr}
                onChange={e => set("livingExpensesInr", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Total COA (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.totalCostOfAttInr}
                onChange={e => set("totalCostOfAttInr", e.target.value)}
                placeholder="If blank, tuition + living is used" />
            </div>
            <div>
              <label className={labelClass}>Scholarships (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.scholarshipInr}
                onChange={e => set("scholarshipInr", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Mutual Funds (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.mutualFundInr}
                onChange={e => set("mutualFundInr", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Fixed Deposits (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.fdInr}
                onChange={e => set("fdInr", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Bank Savings (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.bankSavingsInr}
                onChange={e => set("bankSavingsInr", e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Other Savings (INR)</label>
              <input className={inputClass} type="number" min="0"
                value={form.otherSavingsInr}
                onChange={e => set("otherSavingsInr", e.target.value)} />
            </div>
          </div>
        </Collapsible>

        {/* Penalty checkpoints */}
        <Collapsible
          title="Fraud / Verification Checkpoints (§4.2)"
          open={openSection === "penalties"}
          onToggle={() => toggleSection("penalties")}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Address Pincode (Applicant)</label>
              <input className={inputClass} type="text" maxLength={8}
                value={form.addressPincode}
                onChange={e => set("addressPincode", e.target.value)}
                placeholder="e.g. 400001" />
            </div>
            <div>
              <label className={labelClass}>Document Authenticity (§21)</label>
              <select className={inputClass} value={form.documentAuthenticityStatus}
                onChange={e => set("documentAuthenticityStatus", e.target.value)}>
                {DOC_AUTH_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Admission / Visa / Flight (§22)</label>
              <select className={inputClass} value={form.admissionVisaFlightStatus}
                onChange={e => set("admissionVisaFlightStatus", e.target.value)}>
                {ADMIT_VISA_FLIGHT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Insurance Bundle (§25)</label>
              <select className={inputClass} value={form.insuranceBundle}
                onChange={e => set("insuranceBundle", e.target.value)}>
                {INSURANCE_BUNDLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            <CheckboxRow label="Credit: 15+ DPD in last 36 months (−10%)"
              checked={form.creditDefault15PlusDpd}
              onChange={v => set("creditDefault15PlusDpd", v)} />
            <CheckboxRow label="Credit: Write-off / settled in last 24 months (−20%)"
              checked={form.creditDefaultWriteOff}
              onChange={v => set("creditDefaultWriteOff", v)} />
            <CheckboxRow label="Credit: Overdue > ₹3,000 (−5%)"
              checked={form.creditOverdueAbove3k}
              onChange={v => set("creditOverdueAbove3k", v)} />
            <CheckboxRow label="Social media red flags (−10%)"
              checked={form.socialMediaRedFlag}
              onChange={v => set("socialMediaRedFlag", v)} />
            <CheckboxRow label="Early EMI bounce history (ops flag, 0%)"
              checked={form.earlyEmiBounceHistory}
              onChange={v => set("earlyEmiBounceHistory", v)} />
            <CheckboxRow label="Consultant blacklist hit (ops flag, 0%)"
              checked={form.consultantBlacklistHit}
              onChange={v => set("consultantBlacklistHit", v)} />
          </div>
        </Collapsible>
      </section>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {submittingLabel}
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

interface CollapsibleProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Collapsible({ title, open, onToggle, children }: CollapsibleProps) {
  return (
    <div className="border border-slate-200 rounded-xl mb-3 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700"
      >
        <span>{title}</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        className="w-4 h-4 rounded border-slate-300 text-amber-600"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
