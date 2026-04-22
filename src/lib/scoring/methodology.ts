/**
 * Methodology version. Bump whenever ANY of the following change in a way
 * that would move a result number:
 *  - scoring weights or bands
 *  - multiplier values (university / degree / city / experience / growth)
 *  - data sources swapped in or out
 *  - heuristic thresholds
 *
 * Results persisted in the database carry the version that produced them,
 * so historical assessments remain reproducible even after a recalibration.
 */
export const METHODOLOGY_VERSION = "2026.04.2";

export const METHODOLOGY_CHANGELOG: { version: string; date: string; summary: string }[] = [
  {
    version: "2026.04.2",
    date: "2026-04-22",
    summary:
      "US Year-3 / Year-5 salary trajectory moved from fixed +15% / +32% to live " +
      "FRED CES0500000003 (Total Private hourly earnings) CAGR. SOC / ISCO-08 / " +
      "NOC 2021 / ANZSCO 2022 occupation crosswalk added for future non-US feeds.",
  },
  {
    version: "2026.04.1",
    date: "2026-04-22",
    summary:
      "Live FX via Frankfurter (ECB). P25/P75 confidence bands on FIP base salary. " +
      "Aggregate LIVE/SNAPSHOT/HEURISTIC provenance badge. Stale-source warning (>18mo). " +
      "Unverified non-US country earnings downgraded to heuristic pending primary-source audit.",
  },
];
