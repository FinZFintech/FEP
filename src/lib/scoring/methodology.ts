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
export const METHODOLOGY_VERSION = "2026.04.5";

export const METHODOLOGY_CHANGELOG: { version: string; date: string; summary: string }[] = [
  {
    version: "2026.04.5",
    date: "2026-04-22",
    summary:
      "US city wage multiplier upgraded to live Census ACS 5-yr B20004_006E " +
      "(median earnings for graduate/professional degree holders, by MSA). " +
      "Non-US city multipliers reclassified from HEURISTIC to SNAPSHOT with " +
      "source citations (ONS ASHE / StatCan CMA / ABS / Bundesagentur / INSEE etc.).",
  },
  {
    version: "2026.04.4",
    date: "2026-04-22",
    summary:
      "UK base salary upgraded: live Nomis ASHE NM_30_1 (gross annual pay by SOC 2020, " +
      "median + P25/P75) with SNAPSHOT fallback. All other non-US embedded salary tables " +
      "reclassified from HEURISTIC to SNAPSHOT with primary-source vintage tags " +
      "(HESA LEO 2022-23, StatCan LFS 2024, QILT GOS 2024, OECD EAG 2024, etc.).",
  },
  {
    version: "2026.04.3",
    date: "2026-04-22",
    summary:
      "Non-US Year-3 / Year-5 salary trajectory moved from fixed +15% / +32% heuristic " +
      "to live national wage-index CAGR: ONS KAB9 (UK), StatCan 14-10-0063-01 (Canada), " +
      "Eurostat lc_lci_r2 wages component (DE/FR/IE/NL/SE), ABS WPI (Australia). " +
      "UK SOC 2020 unit-group codes added to occupation crosswalk.",
  },
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
