/**
 * Framework §15 (4f) — Savings Availability (skin in the game).
 *
 * skinInGame %   = (scholarships + MF + FD + bank savings + other) / COA
 *
 * Bands (on COA):
 *   >50% → 10
 *   >40% → 8
 *   >30% → 6
 *   >20% → 4
 *   >10% → 2
 *   >0%  → 0
 */

import type {
  ModuleBreakdownItem,
  ModuleResult,
  SavingsInput,
} from "./types";

export interface SavingsRuleParams {
  /** Bands ordered high-to-low on minimum % of COA covered. */
  bands: { minPct: number; score: number; label: string }[];
}

export const DEFAULT_SAVINGS_PARAMS: SavingsRuleParams = {
  bands: [
    { minPct: 0.50, score: 10, label: ">50% of COA" },
    { minPct: 0.40, score: 8,  label: ">40% of COA" },
    { minPct: 0.30, score: 6,  label: ">30% of COA" },
    { minPct: 0.20, score: 4,  label: ">20% of COA" },
    { minPct: 0.10, score: 2,  label: ">10% of COA" },
    { minPct: 0.00, score: 0,  label: "≤10% of COA" },
  ],
};

export function computeSavings(
  input: SavingsInput,
  params: SavingsRuleParams = DEFAULT_SAVINGS_PARAMS,
): ModuleResult {
  const total =
    input.scholarshipInr +
    input.mutualFundInr +
    input.fdInr +
    input.bankSavingsInr +
    input.otherSavingsInr;

  const coa = Math.max(1, input.totalCostOfAttInr);
  const pct = total / coa;

  let score = 0;
  let label = params.bands[params.bands.length - 1].label;
  for (const b of params.bands) {
    if (pct > b.minPct) {
      score = b.score;
      label = b.label;
      break;
    }
  }

  const breakdown: ModuleBreakdownItem[] = [
    { label: "Scholarships", value: `₹${input.scholarshipInr.toLocaleString("en-IN")}`, rationale: "Non-repayable award." },
    { label: "Mutual Funds",  value: `₹${input.mutualFundInr.toLocaleString("en-IN")}`,  rationale: "Liquid savings in mutual funds." },
    { label: "Fixed Deposits", value: `₹${input.fdInr.toLocaleString("en-IN")}`,          rationale: "Liquid FDs available to redeem." },
    { label: "Bank savings",   value: `₹${input.bankSavingsInr.toLocaleString("en-IN")}`, rationale: "Average bank balance / SA." },
    { label: "Other",          value: `₹${input.otherSavingsInr.toLocaleString("en-IN")}`, rationale: "Any additional margin sources." },
    {
      label: "Total skin-in-the-game",
      value: `₹${total.toLocaleString("en-IN")} (${(pct * 100).toFixed(1)}% of COA)`,
      rationale: `COA = ₹${coa.toLocaleString("en-IN")}.`,
    },
    { label: "Band", value: `${score}/10 (${label})`, rationale: "Mapped from skin-in-the-game %." },
  ];

  return {
    score,
    rationale: `Skin-in-the-game ${(pct * 100).toFixed(1)}% of COA → ${score}/10 (${label}).`,
    breakdown,
  };
}
