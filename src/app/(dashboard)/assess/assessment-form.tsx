"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const COUNTRIES = ["US", "UK", "Canada", "Australia", "Germany", "France", "Ireland"];
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

interface FormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  loading: boolean;
}

export function AssessmentForm({ onSubmit, loading }: FormProps) {
  const [form, setForm] = useState({
    studentName: "",
    undergradInstitution: "",
    undergradTier: "NIT",
    undergradDegree: "B.Tech",
    undergradMajor: "Computer Science",
    undergradCgpa: "",
    cgpaScale: "10",
    greScore: "",
    gmatScore: "",
    workExperienceYears: "0",
    destinationCountry: "US",
    destinationUniversity: "",
    targetDegree: "MS",
    targetCourse: "Computer Science",
    isStem: true,
    programDurationMonths: "24",
    targetCity: "",
    loanAmountInr: "",
    notes: "",
  });

  const set = (key: string, val: unknown) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cgpa = parseFloat(form.undergradCgpa);
    // Normalise CGPA to 10-point scale for storage
    const normCgpa = form.cgpaScale === "4" ? cgpa : cgpa;

    onSubmit({
      studentName: form.studentName,
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
              Computing...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Run Assessment
            </>
          )}
        </button>
      </div>
    </form>
  );
}
