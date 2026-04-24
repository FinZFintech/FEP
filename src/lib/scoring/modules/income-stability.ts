/**
 * Framework §13 (4b) — Co-applicant Income Stability (joint coverage of
 * future EMI by applicant + co-applicants + FEP).
 *
 * Per person:
 *   total annual income  = salary + rental + other
 *   monthly disposable    = (annual × FOIR) / 12  — FOIR default 0.5
 *   max EMI serviceable   = monthly disposable − sum(existing EMIs)
 *
 * Joint coverage = Σ (max EMI serviceable across applicant + co-apps) /
 *                  future EMI post-moratorium
 *              +  FEP-scaled disposable / future EMI post-moratorium
 *              (FEP applied at 100/50/25% if university score is 10/8/6)
 *
 * Score band depends on university rank tier:
 *   Top 100         → 10% / 25% / 45% / 65% floor at 0 → 4 → 6 → 8 → 10
 *   101–350         → 25% / 45% / 65% / 85% floor at 0 → 4 → 6 → 8 → 10
 *   351–500         → 45% / 65% / 85% / 95% floor at 0 → 4 → 6 → 8 → 10
 *   Unranked/reputed→ 65% / 80% / 95% / 100%  floor at 0 → 4 → 6 → 8 → 10
 *
 * Below the floor ⇒ hardReject=true (reject case).
 */

import type {
  CoApplicantInput,
  IncomeStabilityInput,
  ModuleBreakdownItem,
  ModuleResult,
  UniversityRankTier,
} from "./types";

export interface IncomeStabilityRuleParams {
  /** Default FOIR used to compute disposable income from total annual income. */
  defaultFoir: number;
  /** FEP application % by university score (10 / 8 / 6 in framework). */
  fepApplicationByUniversityScore: { score: number; pct: number }[];
  /** Per-tier coverage bands: ordered ascending; below first entry ⇒ reject. */
  coverageBandsByRankTier: Record<
    UniversityRankTier,
    { minCoverage: number; score: number; label: string }[]
  >;
}

export const DEFAULT_INCOME_STABILITY_PARAMS: IncomeStabilityRuleParams = {
  defaultFoir: 0.5,
  fepApplicationByUniversityScore: [
    { score: 10, pct: 1.0 },
    { score: 8,  pct: 0.5 },
    { score: 6,  pct: 0.25 },
  ],
  coverageBandsByRankTier: {
    TOP_100: [
      { minCoverage: 0.65, score: 10, label: "≥65% joint coverage" },
      { minCoverage: 0.45, score: 8,  label: "≥45% joint coverage" },
      { minCoverage: 0.25, score: 6,  label: "≥25% joint coverage" },
      { minCoverage: 0.10, score: 4,  label: "≥10% joint coverage" },
    ],
    RANK_101_350: [
      { minCoverage: 0.85, score: 10, label: "≥85% joint coverage" },
      { minCoverage: 0.65, score: 8,  label: "≥65% joint coverage" },
      { minCoverage: 0.45, score: 6,  label: "≥45% joint coverage" },
      { minCoverage: 0.25, score: 4,  label: "≥25% joint coverage" },
    ],
    RANK_351_500: [
      { minCoverage: 0.95, score: 10, label: "≥95% joint coverage" },
      { minCoverage: 0.85, score: 8,  label: "≥85% joint coverage" },
      { minCoverage: 0.65, score: 6,  label: "≥65% joint coverage" },
      { minCoverage: 0.45, score: 4,  label: "≥45% joint coverage" },
    ],
    UNRANKED_REPUTED: [
      { minCoverage: 1.00, score: 10, label: "≥100% joint coverage" },
      { minCoverage: 0.95, score: 8,  label: "≥95% joint coverage" },
      { minCoverage: 0.80, score: 6,  label: "≥80% joint coverage" },
      { minCoverage: 0.65, score: 4,  label: "≥65% joint coverage" },
    ],
  },
};

interface PersonCoverage {
  label: string;
  annual: number;
  monthlyDisposable: number;
  existingEmi: number;
  maxEmiServiceable: number;
}

function computePersonCoverage(
  label: string,
  salary: number,
  rental: number,
  other: number,
  existingEmis: number[] | undefined,
  foir: number,
): PersonCoverage {
  const annual = salary + rental + other;
  const monthlyDisposable = (annual * foir) / 12;
  const existingEmi = (existingEmis ?? []).reduce((s, v) => s + v, 0);
  return {
    label,
    annual,
    monthlyDisposable,
    existingEmi,
    maxEmiServiceable: Math.max(0, monthlyDisposable - existingEmi),
  };
}

function personLabel(c: CoApplicantInput, i: number): string {
  return `Co-app ${i + 1} (${c.relation.toLowerCase()})`;
}

function fepApplicationPct(
  universityScore0to10: number,
  rules: IncomeStabilityRuleParams["fepApplicationByUniversityScore"],
): number {
  // Framework: 100% at ≥10, 50% at ≥8, 25% at ≥6, 0% otherwise.
  const sorted = [...rules].sort((a, b) => b.score - a.score);
  for (const r of sorted) {
    if (universityScore0to10 >= r.score) return r.pct;
  }
  return 0;
}

export function computeIncomeStability(
  input: IncomeStabilityInput,
  params: IncomeStabilityRuleParams = DEFAULT_INCOME_STABILITY_PARAMS,
): ModuleResult {
  const foir = params.defaultFoir;
  const breakdown: ModuleBreakdownItem[] = [];

  const applicant = computePersonCoverage(
    "Applicant",
    input.applicantAnnualSalary ?? 0,
    0,
    input.applicantAnnualOther ?? 0,
    input.applicantExistingEmis,
    foir,
  );

  const persons: PersonCoverage[] = [applicant];
  input.coApplicants.forEach((c, i) => {
    persons.push(
      computePersonCoverage(
        personLabel(c, i),
        c.annualSalary ?? 0,
        c.annualRental ?? 0,
        c.annualOther ?? 0,
        c.existingEmis,
        foir,
      ),
    );
  });

  const totalPersonServiceable = persons.reduce((s, p) => s + p.maxEmiServiceable, 0);

  const fepPct = fepApplicationPct(
    input.universityScore0to10,
    params.fepApplicationByUniversityScore,
  );
  const fepServiceable = input.fepMonthlyDisposableInr * fepPct;

  const futureEmi = Math.max(1, input.futureEmiInr);
  const coverageFromPersons = totalPersonServiceable / futureEmi;
  const coverageFromFep = fepServiceable / futureEmi;
  const jointCoverage = coverageFromPersons + coverageFromFep;

  persons.forEach((p) => {
    breakdown.push({
      label: p.label,
      value: `₹${Math.round(p.maxEmiServiceable).toLocaleString("en-IN")}/mo serviceable`,
      rationale:
        `Annual ₹${Math.round(p.annual).toLocaleString("en-IN")} × FOIR ${foir} / 12 = ` +
        `₹${Math.round(p.monthlyDisposable).toLocaleString("en-IN")} disposable − ` +
        `₹${Math.round(p.existingEmi).toLocaleString("en-IN")} existing EMIs.`,
    });
  });

  breakdown.push({
    label: "FEP contribution",
    value: `${(fepPct * 100).toFixed(0)}% of ₹${Math.round(input.fepMonthlyDisposableInr).toLocaleString("en-IN")}/mo = ₹${Math.round(fepServiceable).toLocaleString("en-IN")}/mo`,
    rationale:
      `University score ${input.universityScore0to10}/10 ⇒ apply ${(fepPct * 100).toFixed(0)}% of FEP per §13/§16.`,
  });

  breakdown.push({
    label: "Future EMI post-moratorium",
    value: `₹${Math.round(futureEmi).toLocaleString("en-IN")}/mo`,
    rationale: "Joint obligation for applicant + co-applicants.",
  });

  breakdown.push({
    label: "Joint coverage",
    value: `${(jointCoverage * 100).toFixed(1)}%`,
    rationale:
      `Persons cover ${(coverageFromPersons * 100).toFixed(1)}% + FEP covers ${(coverageFromFep * 100).toFixed(1)}%.`,
  });

  const bands = params.coverageBandsByRankTier[input.universityRankTier];
  // bands are in descending order of minCoverage
  let score = 0;
  let label = "Below reject floor";
  for (const b of bands) {
    if (jointCoverage >= b.minCoverage) {
      score = b.score;
      label = b.label;
      break;
    }
  }
  const hardReject = score === 0;

  breakdown.push({
    label: "Tier band",
    value: `${score}/10 (${label})`,
    rationale:
      `Tier ${input.universityRankTier} floor requires at least ` +
      `${(bands[bands.length - 1].minCoverage * 100).toFixed(0)}% joint coverage.`,
  });

  return {
    score,
    rationale: hardReject
      ? `REJECT: joint coverage ${(jointCoverage * 100).toFixed(1)}% is below the ` +
        `${(bands[bands.length - 1].minCoverage * 100).toFixed(0)}% floor for tier ${input.universityRankTier}.`
      : `Income stability score ${score}/10 — ${label}.`,
    hardReject,
    breakdown,
  };
}

/**
 * Convenience: map a universityScore (0–10) to a UniversityRankTier used by
 * the §13 coverage-band lookup.  Tuned to the framework's §8 bands:
 *   Top 100  ~ score 10   (QS T50 / T100)
 *   101–350  ~ score 8    (QS T200 / T500 top end)
 *   351–500  ~ score 5    (T500)
 *   Unranked reputed ~ 2  (unrankedButReputed)
 */
export function universityScoreToRankTier(universityScore: number): UniversityRankTier {
  if (universityScore >= 9) return "TOP_100";
  if (universityScore >= 7) return "RANK_101_350";
  if (universityScore >= 4) return "RANK_351_500";
  return "UNRANKED_REPUTED";
}
