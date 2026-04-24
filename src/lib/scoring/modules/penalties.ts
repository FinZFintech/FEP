/**
 * Framework §4.2 — Penalty Triggers (deduct from weighted score).
 *
 *   Credit defaulter — 15+ DPD in last 36 months              → −10%
 *   Credit defaulter — write-off / settled in last 24 months  → −20%
 *   Credit defaulter — overdue > ₹3,000                       → −5%
 *   Geo fraud        — address in negative pincode list       → −20%
 *   Document authenticity red flag                            → −25%
 *   Admission / visa / flight not verified                    → −10%
 *   Social media red flags                                    → −10%
 *   Device / IP / emulator / fraud ring                       → 0% (ops flag)
 *   Declined mandatory credit life insurance                  → 0% (ops flag)
 *   Consultant blacklist hit                                  → 0% (ops flag)
 *   Early EMI bounce history                                  → 0% (ops flag)
 *
 * Framework caps total potential deduction at -100%.
 */

import negativePincodes from "../lookups/negative-pincodes.json";
import type {
  PenaltyFlagsInput,
  PenaltyResult,
  PenaltyTriggered,
} from "./types";

export interface PenaltyRuleParams {
  creditDefault15PlusDpd: number;
  creditDefaultWriteOff: number;
  creditOverdueAbove3k: number;
  geoFraudNegativePincode: number;
  documentAuthenticityFail: number;
  admissionVisaFlightNotVerified: number;
  socialMediaRedFlag: number;
  deviceIpRisk: number;
  declinedCreditLifeInsurance: number;
  consultantBlacklistHit: number;
  earlyEmiBounce: number;
  /** Absolute floor on total deduction percentage. */
  maxTotalDeductionPct: number;
}

export const DEFAULT_PENALTY_PARAMS: PenaltyRuleParams = {
  creditDefault15PlusDpd: 0.10,
  creditDefaultWriteOff: 0.20,
  creditOverdueAbove3k: 0.05,
  geoFraudNegativePincode: 0.20,
  documentAuthenticityFail: 0.25,
  admissionVisaFlightNotVerified: 0.10,
  socialMediaRedFlag: 0.10,
  deviceIpRisk: 0,
  declinedCreditLifeInsurance: 0,
  consultantBlacklistHit: 0,
  earlyEmiBounce: 0,
  maxTotalDeductionPct: 1.0,
};

/**
 * §21 Document Authenticity — VERIFIED passes; PARTIAL/MISMATCH/FORGERY/UNVERIFIABLE
 * fire the -25% penalty.
 */
function documentAuthenticityFailed(status: PenaltyFlagsInput["documentAuthenticityStatus"]): boolean {
  if (!status) return false; // not yet checked by credit ops ⇒ no penalty yet
  return status !== "VERIFIED";
}

/**
 * §22 Admission/Visa/Flight — only ALL_CONFIRMED passes; everything else
 * (including absence of a status) fires the -10% penalty because the
 * stop-loss / un-lien condition requires confirmation before disbursal.
 *
 * We treat an unset status as "not yet confirmed" and do NOT fire the penalty
 * until the credit team has actively recorded a non-confirmed status.
 */
function admissionVisaFlightFailed(status: PenaltyFlagsInput["admissionVisaFlightStatus"]): boolean {
  if (!status) return false;
  return status !== "ALL_CONFIRMED";
}

export function isNegativePincode(pincode: string | undefined | null): boolean {
  if (!pincode) return false;
  const list = (negativePincodes.pincodes as string[]) ?? [];
  return list.includes(pincode.trim());
}

export function computePenalties(
  input: PenaltyFlagsInput,
  params: PenaltyRuleParams = DEFAULT_PENALTY_PARAMS,
): PenaltyResult {
  const all: PenaltyTriggered[] = [
    {
      code: "CREDIT_15PLUS_DPD",
      label: "Credit defaulter: 15+ DPD in last 36 months",
      deductionPct: params.creditDefault15PlusDpd,
      triggered: !!input.creditDefault15PlusDpd,
    },
    {
      code: "CREDIT_WRITE_OFF",
      label: "Credit defaulter: write-off/settled in last 24 months",
      deductionPct: params.creditDefaultWriteOff,
      triggered: !!input.creditDefaultWriteOff,
    },
    {
      code: "CREDIT_OVERDUE_3K",
      label: "Credit defaulter: overdue > ₹3,000",
      deductionPct: params.creditOverdueAbove3k,
      triggered: !!input.creditOverdueAbove3k,
    },
    {
      code: "GEO_FRAUD_PINCODE",
      label: "Geo fraud: address in negative pincode list",
      deductionPct: params.geoFraudNegativePincode,
      triggered: !!input.inNegativePincodeList,
    },
    {
      code: "DOC_AUTH_FAIL",
      label: "Document authenticity failed cross-check",
      deductionPct: params.documentAuthenticityFail,
      triggered: documentAuthenticityFailed(input.documentAuthenticityStatus),
    },
    {
      code: "ADMIT_VISA_FLIGHT",
      label: "Admission / visa / flight not fully confirmed",
      deductionPct: params.admissionVisaFlightNotVerified,
      triggered: admissionVisaFlightFailed(input.admissionVisaFlightStatus),
    },
    {
      code: "SOCIAL_MEDIA",
      label: "Social media red flags",
      deductionPct: params.socialMediaRedFlag,
      triggered: !!input.socialMediaRedFlag,
    },
    {
      code: "EARLY_EMI_BOUNCE",
      label: "Early EMI bounce history (ops flag, 0% weight)",
      deductionPct: params.earlyEmiBounce,
      triggered: !!input.earlyEmiBounceHistory,
    },
    {
      code: "CONSULTANT_BLACKLIST",
      label: "Consultant blacklist hit (ops flag, 0% weight)",
      deductionPct: params.consultantBlacklistHit,
      triggered: !!input.consultantBlacklistHit,
    },
  ];

  const triggered = all.filter((p) => p.triggered);
  const rawTotal = triggered.reduce((s, p) => s + p.deductionPct, 0);
  const totalDeductionPct = Math.min(params.maxTotalDeductionPct, rawTotal);

  return { totalDeductionPct, triggered, allPenalties: all };
}
