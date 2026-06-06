export {
  DEFAULT_INFLATION,
  KOEFICIENTY_2026,
  PREDIKCE_VARIANTY,
  ROK_DNES,
  ROK_PARAMETRY,
  deflateToToday,
  duchodovyVek,
  getKoeficienty,
  getParametry,
  type Gender,
  type RokParametry,
  type Varianta,
} from "./parameters";

export {
  redukujOvz,
  vypocet,
  vypocetVsechnyVarianty,
  type RocniDetail,
  type Vstup,
  type VstupRok,
  type Vysledek,
} from "./calculator";

export { toStatePensionResult } from "./adapter";

export {
  sazbaProStupen,
  vypocetInvalidni,
  type InvalidniVysledek,
  type StupenInvalidity,
} from "./disability";
