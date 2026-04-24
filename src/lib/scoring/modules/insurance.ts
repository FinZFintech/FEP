/**
 * Framework §25 — Insurance & Risk Mitigation.
 *
 * Policy: mandatory bundled life + health cover when loan ticket > ₹20L.
 * §4.2 penalty weight is currently 0% (flagged for ops visibility only) but
 * we compute + surface it so the UI can warn the credit team.
 */

import type { InsuranceInput, InsuranceResult } from "./types";

export interface InsuranceRuleParams {
  /** Loan amount threshold above which bundled life+health is mandatory. */
  mandatoryThresholdInr: number;
}

export const DEFAULT_INSURANCE_PARAMS: InsuranceRuleParams = {
  mandatoryThresholdInr: 2_000_000,
};

export function computeInsurance(
  input: InsuranceInput,
  params: InsuranceRuleParams = DEFAULT_INSURANCE_PARAMS,
): InsuranceResult {
  const loan = input.loanAmountInr ?? 0;
  const mandatory = loan > params.mandatoryThresholdInr;
  const bundle = input.bundle ?? "NONE";

  if (!mandatory) {
    return {
      flagged: false,
      mandatory: false,
      rationale: `Loan ₹${loan.toLocaleString("en-IN")} is below the ₹${params.mandatoryThresholdInr.toLocaleString("en-IN")} bundled-cover threshold; insurance is optional.`,
    };
  }

  const ok = bundle === "LIFE_ACC_HEALTH";
  return {
    flagged: !ok,
    mandatory: true,
    rationale: ok
      ? "Bundled life + accidental + health cover is in place."
      : `Loan > ₹${params.mandatoryThresholdInr.toLocaleString("en-IN")} requires bundled life + health; current bundle is ${bundle}. Escalate to credit ops.`,
  };
}
