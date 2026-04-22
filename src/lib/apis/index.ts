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

export { getOccupationCodes, OCCUPATION_CROSSWALK } from "./crosswalks/occupations";
export type { OccupationCodes } from "./crosswalks/occupations";
