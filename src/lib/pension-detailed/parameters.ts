/**
 * Parametry pro výpočet starobního důchodu v ČR (2026+).
 *
 * Port `parameters.py` z buggyb12/duchodovaKalkulacka.
 *
 * Zdroje:
 * - Nařízení vlády 365/2025 Sb. (parametry pro rok 2026)
 * - ČSSZ Tisková zpráva 10. 12. 2025
 * - Zákon č. 155/1995 Sb. o důchodovém pojištění
 *
 * Pro roky 2027+ se parametry odhadují (ČSSZ varianty).
 */

export type Gender = "M" | "Z";

export type Varianta =
  | "minimalisticka"
  | "zakladni"
  | "stredni"
  | "optimisticka";

export interface RokParametry {
  zakladniVymera: number;
  redukce1: number;
  redukce2: number;
  zapocetDo1: number;
  zapocet1To2: number;
  procentoZaRok: number;
  prumernaMzda: number;
  vseobecnyVzPredchozi: number;
  prepocitavaciKoef: number;
  minDuchod: number;
  maxRocniVz: number;
  vychovneZaDite: number;
}

/**
 * Koeficienty nárůstu všeobecného vyměřovacího základu pro důchod přiznaný 2026.
 * Zdroj: vyhláška MPSV pro 2026.
 */
export const KOEFICIENTY_2026: Record<number, number> = {
  1986: 16.5205, 1987: 16.182, 1988: 15.8212, 1989: 15.4469,
  1990: 14.9016, 1991: 12.9132, 1992: 10.5441, 1993: 8.4179,
  1994: 7.1007, 1995: 5.992, 1996: 5.0606, 1997: 4.578,
  1998: 4.1877, 1999: 3.8694, 2000: 3.6299, 2001: 3.3447,
  2002: 3.1167, 2003: 2.9201, 2004: 2.7383, 2005: 2.6034,
  2006: 2.4422, 2007: 2.2747, 2008: 2.1034, 2009: 2.0326,
  2010: 1.9965, 2011: 1.9514, 2012: 1.8904, 2013: 1.8904,
  2014: 1.8578, 2015: 1.8032, 2016: 1.7333, 2017: 1.6238,
  2018: 1.5062, 2019: 1.4085, 2020: 1.3557, 2021: 1.2787,
  2022: 1.2049, 2023: 1.121, 2024: 1.0581, 2025: 1.0,
};

export const ROK_PARAMETRY: Record<number, RokParametry> = {
  2026: {
    zakladniVymera: 4900,
    redukce1: 21546,
    redukce2: 195868,
    zapocetDo1: 0.99,
    zapocet1To2: 0.26,
    procentoZaRok: 0.01495,
    prumernaMzda: 48967,
    vseobecnyVzPredchozi: 46278,
    prepocitavaciKoef: 1.0581,
    minDuchod: 9800,
    maxRocniVz: 2350416,
    vychovneZaDite: 500,
  },
};

/**
 * Predikční varianty růstu průměrné mzdy pro roky 2027+.
 * Hodnoty jsou meziroční růst.
 */
export const PREDIKCE_VARIANTY: Record<Varianta, number> = {
  minimalisticka: 0.025,
  zakladni: 0.04,
  stredni: 0.05,
  optimisticka: 0.06,
};

/** Konzervativní default inflace pro deflátor nominál → dnešní kupní síla. */
export const DEFAULT_INFLATION = 0.03;
export const ROK_DNES = new Date().getFullYear();

/**
 * Převede nominální Kč v `rokPriznani` na dnešní kupní sílu (deflátováno
 * inflací). Pokud `rokPriznani <= rokDnes`, vrací částku beze změny.
 */
export function deflateToToday(
  amount: number,
  rokPriznani: number,
  rokDnes: number = ROK_DNES,
  inflace: number = DEFAULT_INFLATION,
): number {
  if (rokPriznani <= rokDnes) return amount;
  const deflator = Math.pow(1 + inflace, rokPriznani - rokDnes);
  return amount / deflator;
}

/**
 * Vrátí parametry pro daný rok přiznání důchodu.
 * Pro 2026 vrací natvrdo. Pro 2027+ extrapoluje podle zvolené varianty.
 */
export function getParametry(rok: number, varianta: Varianta = "zakladni"): RokParametry {
  if (ROK_PARAMETRY[rok]) {
    return { ...ROK_PARAMETRY[rok] };
  }
  if (rok < 2026) {
    throw new Error(`Aplikace podporuje rok přiznání 2026+. Dostala: ${rok}`);
  }

  const base = { ...ROK_PARAMETRY[2026] };
  const rust = PREDIKCE_VARIANTY[varianta];
  const pocetLet = rok - 2026;
  const faktor = Math.pow(1 + rust, pocetLet);

  base.prumernaMzda = Math.round(base.prumernaMzda * faktor);
  base.redukce1 = Math.round(base.redukce1 * faktor);
  base.redukce2 = Math.round(base.redukce2 * faktor);
  base.zakladniVymera = Math.round(base.prumernaMzda * 0.1);
  base.minDuchod = Math.round(base.prumernaMzda * 0.2);
  base.maxRocniVz = Math.round(base.prumernaMzda * 48);

  // Procento za rok pojištění klesá o 0,005 % ročně (2026: 1,495 %, 2035: 1,45 %)
  if (rok <= 2035) {
    base.procentoZaRok = Math.round((0.01495 - (rok - 2026) * 0.00005) * 100000) / 100000;
  } else {
    base.procentoZaRok = 0.0145;
  }

  // Zápočet do 1. RH klesá o 1 % ročně (2026: 99 %, 2035: 90 %)
  if (rok <= 2035) {
    base.zapocetDo1 = Math.round((0.99 - (rok - 2026) * 0.01) * 10000) / 10000;
  } else {
    base.zapocetDo1 = 0.9;
  }

  return base;
}

/**
 * Vrátí koeficienty nárůstu VZ pro roky 1986 až (rokPriznani - 1).
 */
export function getKoeficienty(
  rokPriznani: number,
  varianta: Varianta = "zakladni",
): Record<number, number> {
  if (rokPriznani === 2026) {
    return { ...KOEFICIENTY_2026 };
  }
  const rust = PREDIKCE_VARIANTY[varianta];
  const pocetLetNavic = rokPriznani - 2026;
  const faktorSkok = Math.pow(1 + rust, pocetLetNavic);

  const koef: Record<number, number> = {};
  for (const [rStr, v] of Object.entries(KOEFICIENTY_2026)) {
    koef[Number(rStr)] = v * faktorSkok;
  }
  for (let r = 2026; r < rokPriznani; r++) {
    koef[r] = Math.pow(1 + rust, rokPriznani - 1 - r);
  }
  return koef;
}

/**
 * Důchodový věk podle § 32 zákona 155/1995 Sb. (zjednodušeně).
 *
 * Pro ročníky 1971+: 65 let pro muže i ženy.
 * Pro starší ročníky: postupné zvyšování o 2 měsíce/rok od ročníku 1936.
 * Ženy: redukce za vychované děti.
 */
export function duchodovyVek(
  rokNarozeni: number,
  _mesicNarozeni: number,
  pohlavi: Gender,
  pocetDeti: number = 0,
): { roky: number; mesice: number } {
  if (rokNarozeni >= 1971) {
    return { roky: 65, mesice: 0 };
  }

  if (pohlavi === "M") {
    if (rokNarozeni >= 1965) {
      return { roky: 65, mesice: 0 };
    }
    const celkemMesicu = 60 * 12 + (rokNarozeni - 1936) * 2;
    return {
      roky: Math.floor(celkemMesicu / 12),
      mesice: celkemMesicu % 12,
    };
  }

  // Ženy s redukcí za děti (jen pro ročníky < 1971)
  const redukceMesiceZaDite: Record<number, number> = { 0: 0, 1: 0, 2: 4, 3: 8, 4: 8 };
  let redukce: number;
  if (pocetDeti >= 5) {
    redukce = 12 * 4;
  } else {
    redukce = redukceMesiceZaDite[Math.min(pocetDeti, 4)] ?? 12;
  }

  let zakladMesicu: number;
  if (rokNarozeni >= 1965) {
    zakladMesicu = 65 * 12;
  } else {
    zakladMesicu = 60 * 12 + (rokNarozeni - 1936) * 2;
  }

  const celkemMesicu = Math.max(zakladMesicu - redukce, 55 * 12);
  return {
    roky: Math.floor(celkemMesicu / 12),
    mesice: celkemMesicu % 12,
  };
}
