export { getSchoolEarnings, getProgramEarnings } from "./college-scorecard";
export type { SchoolEarningsData, ProgramEarningsData } from "./college-scorecard";

export { getOccupationWages, getOccupationGrowth } from "./bls";
export type { OccupationWageData, OccupationGrowthData } from "./bls";

export { getH1BSalary } from "./h1b";
export type { H1BSalaryData } from "./h1b";

export { getOccupationDetails } from "./onet";
export type { ONetOccupationData } from "./onet";

export { getUsWageGrowth, getUsCpiGrowth, getUsUnemploymentRate } from "./fred";
export type { FredGrowthData, FredLevelData, FredSeriesPoint } from "./fred";

export { getUkWageGrowth } from "./ons";
export type { OnsGrowthData } from "./ons";

export { getCanadaWageGrowth } from "./statcan";
export type { StatCanGrowthData } from "./statcan";

export { getEuWageGrowth, EUROSTAT_SUPPORTED_COUNTRIES } from "./eurostat";
export type { EurostatGrowthData } from "./eurostat";

export { getAustraliaWageGrowth } from "./abs";
export type { AbsGrowthData } from "./abs";

export { getNomisEarnings } from "./nomis";
export type { NomisEarningsData } from "./nomis";

export { getOccupationCodes, OCCUPATION_CROSSWALK } from "./crosswalks/occupations";
export type { OccupationCodes } from "./crosswalks/occupations";
