/**
 * Framework §12 (4a) — Applicant & Co-applicant Credit Score.
 *
 * Logic:
 *   - CIBIL and CRIF scored independently per person via the same band table.
 *   - Per-person weighted score = 0.5 × CIBIL + 0.5 × CRIF (drop missing bureaus
 *     and re-normalise over what's provided).
 *   - Overall credit score = average of applicant weighted score and
 *     (mean of co-applicant weighted scores).
 *   - NTC (New To Credit) override: if applicant is NTC *and* transition is
 *     Class 12 → UG or UG → immediate PG, score 8. An additional guardrail
 *     checks average 3-month bank balance vs. the present EMI during study.
 *
 * Returns a 0–10 score.
 */

import type {
  CreditBlockInput,
  ModuleBreakdownItem,
  ModuleResult,
  CoApplicantInput,
} from "./types";

export interface CreditScoreRuleParams {
  /** Thresholds for CIBIL / CRIF bands. */
  bands: { min: number; score: number; label: string }[];
  /** CIBIL / CRIF blend weights per person. */
  bureauBlend: { cibil: number; crif: number };
  /** NTC transition score (Class 12 → UG / UG → PG). */
  ntcTransitionScore: number;
  /** Minimum ABB multiple of future EMI required for NTC to retain full score. */
  ntcAbbEmiMultipleMin: number;
}

export const DEFAULT_CREDIT_SCORE_PARAMS: CreditScoreRuleParams = {
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
};

function scoreFromBands(value: number | undefined, bands: CreditScoreRuleParams["bands"]): { score: number; label: string } | null {
  if (value === undefined || value === null) return null;
  for (const band of bands) {
    if (value >= band.min) return { score: band.score, label: band.label };
  }
  return { score: 0, label: "No score" };
}

function personScore(
  cibil: number | undefined,
  crif: number | undefined,
  params: CreditScoreRuleParams,
): { score: number; rationale: string } | null {
  const cibilBand = scoreFromBands(cibil, params.bands);
  const crifBand = scoreFromBands(crif, params.bands);

  if (!cibilBand && !crifBand) return null;

  const parts: string[] = [];
  let weightedSum = 0;
  let weightTotal = 0;

  if (cibilBand) {
    weightedSum += cibilBand.score * params.bureauBlend.cibil;
    weightTotal += params.bureauBlend.cibil;
    parts.push(`CIBIL ${cibil} → ${cibilBand.score}/10 (${cibilBand.label})`);
  }
  if (crifBand) {
    weightedSum += crifBand.score * params.bureauBlend.crif;
    weightTotal += params.bureauBlend.crif;
    parts.push(`CRIF ${crif} → ${crifBand.score}/10 (${crifBand.label})`);
  }

  return {
    score: weightTotal > 0 ? weightedSum / weightTotal : 0,
    rationale: parts.join("; "),
  };
}

function coApplicantLabel(c: CoApplicantInput, i: number): string {
  return `Co-app ${i + 1} (${c.relation.toLowerCase()})`;
}

export function computeCreditScore(
  input: CreditBlockInput,
  params: CreditScoreRuleParams = DEFAULT_CREDIT_SCORE_PARAMS,
): ModuleResult {
  const breakdown: ModuleBreakdownItem[] = [];

  // NTC path — skip bureau blending entirely if flagged and transition-eligible.
  if (input.isNewToCredit && input.isNtcEligibleTransition) {
    const abb = input.averageBankBalance3moInr ?? 0;
    const emi = input.futureEmiInr ?? 0;
    const abbMultiple = emi > 0 ? abb / emi : Infinity;
    const abbOk = abbMultiple >= params.ntcAbbEmiMultipleMin;

    breakdown.push({
      label: "NTC transition rule",
      value: abbOk ? params.ntcTransitionScore : Math.max(0, params.ntcTransitionScore - 4),
      rationale:
        `Class-12→UG or UG→immediate-PG student, new to credit. ` +
        (emi > 0
          ? `ABB ₹${abb.toLocaleString("en-IN")} is ${abbMultiple.toFixed(1)}× future EMI (need ≥ ${params.ntcAbbEmiMultipleMin}×).`
          : `Future EMI not yet calculable; ABB check deferred.`),
    });

    const score = abbOk
      ? params.ntcTransitionScore
      : Math.max(0, params.ntcTransitionScore - 4);

    return {
      score,
      rationale: abbOk
        ? `NTC transition score (${params.ntcTransitionScore}/10) — ABB covers future EMI.`
        : `NTC transition score reduced — ABB fails the ${params.ntcAbbEmiMultipleMin}× EMI floor.`,
      breakdown,
    };
  }

  // Standard bureau-blended path.
  const applicant = personScore(input.applicantCibilScore, input.applicantCrifScore, params);

  const coAppScores = input.coApplicants
    .map((c, i) => {
      const s = personScore(c.cibilScore, c.crifScore, params);
      if (!s) return null;
      breakdown.push({
        label: coApplicantLabel(c, i),
        value: s.score.toFixed(1),
        rationale: s.rationale,
      });
      return s.score;
    })
    .filter((s): s is number => s !== null);

  if (applicant) {
    breakdown.unshift({
      label: "Applicant",
      value: applicant.score.toFixed(1),
      rationale: applicant.rationale,
    });
  }

  const coAppAvg = coAppScores.length > 0
    ? coAppScores.reduce((a, b) => a + b, 0) / coAppScores.length
    : null;

  if (!applicant && coAppAvg === null) {
    // No data at all — treat as neutral-low until bureau data arrives.
    return {
      score: 0,
      rationale: "No bureau data available for applicant or co-applicants.",
      breakdown: [{ label: "No bureau data", value: 0, rationale: "Awaiting CIBIL / CRIF pulls." }],
    };
  }

  const applicantScore = applicant?.score ?? coAppAvg!;
  const combined = coAppAvg !== null && applicant
    ? (applicantScore + coAppAvg) / 2
    : applicantScore;

  breakdown.push({
    label: "Combined (applicant + co-app avg)",
    value: combined.toFixed(1),
    rationale: coAppAvg !== null && applicant
      ? `Average of applicant (${applicant.score.toFixed(1)}) and co-app mean (${coAppAvg.toFixed(1)}).`
      : applicant
      ? "Applicant-only (no co-applicant bureau data)."
      : "Co-applicant-only (applicant bureau data missing).",
  });

  return {
    score: Math.round(combined * 10) / 10,
    rationale: `Credit score ${combined.toFixed(1)}/10 blended across available bureau records.`,
    breakdown,
  };
}
