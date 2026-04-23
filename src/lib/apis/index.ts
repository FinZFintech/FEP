export { getSchoolEarnings, getProgramEarnings } from "./college-scorecard";
export type { SchoolEarningsData, ProgramEarningsData } from "./college-scorecard";

export { getOccupationWages, getOccupationGrowth } from "./bls";
export type { OccupationWageData, OccupationGrowthData } from "./bls";

export { getH1BSalary } from "./h1b";
export type { H1BSalaryData } from "./h1b";

export { getOccupationDetails } from "./onet";
export type { ONetOccupationData } from "./onet";

export { getUsWageGrowth, getUsCpiGrowth, getUsUnemploymentRate, getUsJoltsSignal } from "./fred";
export type { FredGrowthData, FredLevelData, FredSeriesPoint, JoltsSignal } from "./fred";

export { getUscisH1BSnapshot } from "./uscis-h1b";
export type { UscisH1BSnapshot } from "./uscis-h1b";

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

export { getCensusGradMultiplier, CENSUS_SUPPORTED_CITIES } from "./census";
export type { CensusMultiplierResult } from "./census";

export { getAdzunaSalary, ADZUNA_SUPPORTED_COUNTRIES } from "./adzuna";
export type { AdzunaSalaryData } from "./adzuna";

export { getReturnCountryGrowth, WDI_SUPPORTED_NATIONALITIES } from "./worldbank";
export type { WdiGrowthData } from "./worldbank";

export { getOccupationCodes, OCCUPATION_CROSSWALK } from "./crosswalks/occupations";
export type { OccupationCodes } from "./crosswalks/occupations";
