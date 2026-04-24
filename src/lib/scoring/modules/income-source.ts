/**
 * Framework §14 (4c) — Co-applicant Income Source.
 *
 * Per parent:
 *   Private Sector Employee → 10
 *   Govt Job                 → 7
 *   Self-Employed            → 5
 *   Not Working              → 0
 *   (FARMER / RETIRED mapped to the closest — farmer=5 self-employed-like,
 *    retired falling back to income amount check handled in §13.)
 *
 * Blend: Father × 0.6 + Mother × 0.4.
 * If neither parent is present, fall back to the highest-earning co-applicant.
 */

import type {
  CoApplicantInput,
  ModuleBreakdownItem,
  ModuleResult,
  OccupationType,
} from "./types";

export interface IncomeSourceRuleParams {
  /** Score for each occupation type (0–10). */
  occupationScores: Record<OccupationType, number>;
  /** Blend weights for parents (father / mother). */
  parentBlend: { father: number; mother: number };
}

export const DEFAULT_INCOME_SOURCE_PARAMS: IncomeSourceRuleParams = {
  occupationScores: {
    PRIVATE: 10,
    GOVT: 7,
    SELF_EMPLOYED: 5,
    FARMER: 5,
    RETIRED: 6,
    NOT_WORKING: 0,
  },
  parentBlend: { father: 0.6, mother: 0.4 },
};

function occupationScore(type: OccupationType, params: IncomeSourceRuleParams): number {
  return params.occupationScores[type] ?? 0;
}

export function computeIncomeSource(
  coApplicants: CoApplicantInput[],
  params: IncomeSourceRuleParams = DEFAULT_INCOME_SOURCE_PARAMS,
): ModuleResult {
  const breakdown: ModuleBreakdownItem[] = [];

  const father = coApplicants.find((c) => c.relation === "FATHER");
  const mother = coApplicants.find((c) => c.relation === "MOTHER");

  if (father || mother) {
    const fScore = father ? occupationScore(father.occupationType, params) : 0;
    const mScore = mother ? occupationScore(mother.occupationType, params) : 0;

    // If only one parent present, give them full weight (re-normalised).
    const fW = father ? params.parentBlend.father : 0;
    const mW = mother ? params.parentBlend.mother : 0;
    const totalW = fW + mW;
    const blended = totalW > 0 ? (fScore * fW + mScore * mW) / totalW : 0;

    if (father) {
      breakdown.push({
        label: "Father",
        value: fScore,
        rationale: `${father.occupationType.replace("_", " ").toLowerCase()} → ${fScore}/10.`,
      });
    }
    if (mother) {
      breakdown.push({
        label: "Mother",
        value: mScore,
        rationale: `${mother.occupationType.replace("_", " ").toLowerCase()} → ${mScore}/10.`,
      });
    }
    breakdown.push({
      label: "Blended",
      value: blended.toFixed(2),
      rationale: `Father ${(fW / totalW || 0).toFixed(2)} + Mother ${(mW / totalW || 0).toFixed(2)} weights.`,
    });

    return {
      score: Math.round(blended * 10) / 10,
      rationale:
        father && mother
          ? `Blended father/mother income-source score ${blended.toFixed(1)}/10.`
          : father
          ? `Father-only income-source score ${blended.toFixed(1)}/10 (mother absent).`
          : `Mother-only income-source score ${blended.toFixed(1)}/10 (father absent).`,
      breakdown,
    };
  }

  // No parents — fall back to the highest-scoring co-applicant.
  if (coApplicants.length === 0) {
    return {
      score: 0,
      rationale: "No co-applicants provided.",
      breakdown: [{ label: "No co-applicants", value: 0, rationale: "Nothing to score." }],
    };
  }

  const ranked = coApplicants
    .map((c) => ({ c, s: occupationScore(c.occupationType, params) }))
    .sort((a, b) => b.s - a.s);
  const top = ranked[0];

  breakdown.push({
    label: `Top co-app (${top.c.relation.toLowerCase()})`,
    value: top.s,
    rationale: `${top.c.occupationType.replace("_", " ").toLowerCase()} → ${top.s}/10.`,
  });

  return {
    score: top.s,
    rationale: `No parent co-applicants; using best available co-applicant (${top.c.relation.toLowerCase()}).`,
    breakdown,
  };
}
