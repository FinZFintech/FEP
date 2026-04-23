/**
 * USCIS H-1B approval/denial snapshot derived from the H-1B Employer Data Hub.
 *
 * Source: https://www.uscis.gov/tools/reports-and-studies/h-1b-employer-data-hub
 * Published: annual CSV per fiscal year; refresh via scripts/refresh-uscis-h1b.ts
 * (follow-up; for now the numbers below are embedded as a SNAPSHOT with vintage).
 *
 * These are aggregate national rates, used to refine the heuristic values in
 * nationalities.json when the destination is the US. Engine prefers this
 * source when available; falls back to nationalities.json otherwise.
 *
 * Components of net H-1B probability for a new graduate (master's cap):
 *   1. Registration → selection (the "lottery"): ~27% in FY2024 (85,000 slots
 *      out of ~315,000 eligible beneficiaries after USCIS beneficiary-centric
 *      process reforms).
 *   2. Post-selection petition approval: ~97% of filed petitions from the
 *      selected pool are approved.
 *   3. Net = 0.27 × 0.97 ≈ 0.26 for master's cap.
 *
 * For regular cap (bachelor's only) the selection rate is meaningfully lower.
 * The values below are master's cap — the overwhelming case for our applicants.
 */

export interface UscisH1BSnapshot {
  fiscalYear: string;            // "FY2024"
  lotterySelectionRate: number;  // 0..1 — registration → selection
  postSelectionApprovalRate: number; // 0..1 — selected → approved petition
  netMastersCapProbability: number;  // lotterySelectionRate × postSelectionApprovalRate
  initialApprovalRate: number;       // 0..1 — initial petitions overall (regulatory measure)
  continuingApprovalRate: number;    // 0..1 — continuing petitions (extensions, transfers)
  source: string;
  dataKind: "snapshot";
  vintage: string;
}

const LATEST: UscisH1BSnapshot = {
  fiscalYear: "FY2024",
  lotterySelectionRate: 0.27,
  postSelectionApprovalRate: 0.97,
  netMastersCapProbability: 0.27 * 0.97,
  initialApprovalRate: 0.958,
  continuingApprovalRate: 0.984,
  source:
    "USCIS H-1B Employer Data Hub FY2024 aggregate — master's cap selection 27% × post-selection approval 97%",
  dataKind: "snapshot",
  vintage: "FY2024",
};

/**
 * Returns the most recent embedded USCIS H-1B snapshot. The engine reads
 * this for US destinations and overlays the `h1bLotteryProb` +
 * `sponsorshipRate` sourced from `nationalities.json` with these
 * authoritative aggregates when the destination is the US.
 */
export function getUscisH1BSnapshot(): UscisH1BSnapshot {
  return LATEST;
}
