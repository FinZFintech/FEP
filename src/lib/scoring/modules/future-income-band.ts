/**
 * Framework §16 (5a) — Future Income scoring band.
 *
 * Maps Year-1 FIP disposable monthly income (INR) to 0–10:
 *   > ₹1.5L → 10
 *   ₹1L–₹1.5L → 7
 *   ₹75K–₹1L → 4
 *   < ₹74K → 0
 *
 * Disposable monthly is derived from Y1 INR × FOIR / 12.
 */

import type { ModuleBreakdownItem, ModuleResult } from "./types";

export interface FutureIncomeBandRuleParams {
  foir: number;
  bands: { minInr: number; score: number; label: string }[];
}

export const DEFAULT_FUTURE_INCOME_BAND_PARAMS: FutureIncomeBandRuleParams = {
  foir: 0.5,
  bands: [
    { minInr: 150_000, score: 10, label: "> ₹1.5L / mo" },
    { minInr: 100_000, score: 7,  label: "₹1L – ₹1.5L / mo" },
    { minInr: 75_000,  score: 4,  label: "₹75K – ₹1L / mo" },
    { minInr: 0,       score: 0,  label: "< ₹75K / mo" },
  ],
};

export interface FutureIncomeBandInput {
  fipYear1Inr: number;
}

export function computeFutureIncomeBand(
  input: FutureIncomeBandInput,
  params: FutureIncomeBandRuleParams = DEFAULT_FUTURE_INCOME_BAND_PARAMS,
): ModuleResult & { monthlyDisposableInr: number } {
  const monthlyDisposableInr = (input.fipYear1Inr * params.foir) / 12;

  let score = 0;
  let label = params.bands[params.bands.length - 1].label;
  for (const b of params.bands) {
    if (monthlyDisposableInr >= b.minInr) {
      score = b.score;
      label = b.label;
      break;
    }
  }

  const breakdown: ModuleBreakdownItem[] = [
    {
      label: "Year-1 FIP (INR annual)",
      value: `₹${Math.round(input.fipYear1Inr).toLocaleString("en-IN")}`,
      rationale: "Abroad salary converted to INR (see FIP breakdown).",
    },
    {
      label: "Monthly disposable (FOIR × annual / 12)",
      value: `₹${Math.round(monthlyDisposableInr).toLocaleString("en-IN")}`,
      rationale: `Applying FOIR of ${params.foir} to Year-1 income.`,
    },
    { label: "Band", value: `${score}/10 (${label})`, rationale: "Mapped per §16 bands." },
  ];

  return {
    score,
    rationale: `Future-income disposable of ₹${Math.round(monthlyDisposableInr).toLocaleString("en-IN")}/mo → ${score}/10 (${label}).`,
    breakdown,
    monthlyDisposableInr,
  };
}
