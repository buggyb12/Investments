/**
 * Orientační výpočet invalidního důchodu (I., II. a III. stupně) dle
 * § 39–42 zákona č. 155/1995 Sb.
 *
 * Invalidní důchod vychází ze stejného **výpočtového základu** jako starobní
 * důchod (redukovaný osobní vyměřovací základ) — ten dodá existující engine
 * (`Vysledek.vypoctovyZaklad`). Liší se procentní sazbou za rok a tím, že do
 * doby pojištění se připočítává tzv. **dopočtená doba** — období od vzniku
 * invalidity do dosažení důchodového věku.
 *
 * Procentní výměra = výpočtový základ × sazba × (doba pojištění + dopočtená doba)
 *   sazba III. stupeň = 1,5 % za rok
 *   sazba II. stupeň  = 0,75 % za rok
 *   sazba I. stupeň   = 0,5 % za rok
 * Minimum procentní výměry = 770 Kč; základní výměra je shodná se starobním.
 *
 * Jde o orientační odhad pro poradenskou diskusi, nikoli závazný výpočet ČSSZ.
 */

import type { RokParametry } from "./parameters";

export type StupenInvalidity = 1 | 2 | 3;

export interface InvalidniVysledek {
  stupen: StupenInvalidity;
  procentniVymera: number;
  zakladniVymera: number;
  duchodCelkem: number;
  sazbaPct: number;
  dobaPojisteniRoky: number;
  dopoctenaDobaRoky: number;
}

/** Minimální procentní výměra (shodná se starobním důchodem). */
const MIN_PROCENTNI_VYMERA = 770;

export function sazbaProStupen(stupen: StupenInvalidity): number {
  if (stupen === 3) return 0.015;
  if (stupen === 2) return 0.0075;
  return 0.005; // I. stupeň
}

/**
 * Informace o jednotlivých stupních invalidity — pro klientsky srozumitelné
 * vysvětlení podmínek vzniku nároku (posouzení zdravotního stavu).
 * Pokles pracovní schopnosti se posuzuje dle vyhlášky č. 359/2009 Sb.
 */
export const INVALIDITA_STUPNE: {
  stupen: StupenInvalidity;
  nazev: string;
  poklesText: string;
  sazbaPct: number;
}[] = [
  {
    stupen: 1,
    nazev: "I. stupeň",
    poklesText: "pokles pracovní schopnosti o 35 % až 49 %",
    sazbaPct: 0.5,
  },
  {
    stupen: 2,
    nazev: "II. stupeň",
    poklesText: "pokles pracovní schopnosti o 50 % až 69 %",
    sazbaPct: 0.75,
  },
  {
    stupen: 3,
    nazev: "III. stupeň",
    poklesText: "pokles pracovní schopnosti o 70 % a více",
    sazbaPct: 1.5,
  },
];

/**
 * Potřebná doba pojištění pro nárok na invalidní důchod podle věku (§ 40).
 * Posuzuje se zpravidla v posledních 10 letech (u osob nad 38 let alternativně
 * 10 let v posledních 20 letech).
 */
export const DOBA_POJISTENI_NAROK: { vek: string; doba: string }[] = [
  { vek: "do 20 let", doba: "méně než 1 rok (stačí i 1 den)" },
  { vek: "20–21 let", doba: "1 rok" },
  { vek: "22–23 let", doba: "2 roky" },
  { vek: "24–25 let", doba: "3 roky" },
  { vek: "26–28 let", doba: "4 roky" },
  { vek: "nad 28 let", doba: "5 let v posledních 10 letech" },
  {
    vek: "nad 38 let",
    doba: "5 let v posledních 10 letech, nebo 10 let v posledních 20 letech",
  },
];

/** Vrátí potřebnou dobu pojištění pro daný věk (text pro klienta). */
export function pozadovanaDobaPojisteni(vek: number): string {
  if (vek <= 20) return "méně než 1 rok (stačí i 1 den)";
  if (vek <= 21) return "1 rok v posledních 10 letech";
  if (vek <= 23) return "2 roky v posledních 10 letech";
  if (vek <= 25) return "3 roky v posledních 10 letech";
  if (vek <= 28) return "4 roky v posledních 10 letech";
  if (vek <= 38) return "5 let v posledních 10 letech";
  return "5 let v posledních 10 letech (nebo 10 let v posledních 20)";
}

/**
 * Spočítá orientační výši invalidního důchodu daného stupně.
 *
 * @param vypoctovyZaklad redukovaný osobní vyměřovací základ (z engine)
 * @param dobaPojisteniRoky získané roky pojištění do vzniku invalidity
 * @param dopoctenaDobaRoky doba od vzniku invalidity do důchodového věku
 * @param params parametry roku přiznání (základní výměra apod.)
 * @param stupen I., II. nebo III. stupeň invalidity
 */
export function vypocetInvalidni(
  vypoctovyZaklad: number,
  dobaPojisteniRoky: number,
  dopoctenaDobaRoky: number,
  params: RokParametry,
  stupen: StupenInvalidity,
): InvalidniVysledek {
  const sazba = sazbaProStupen(stupen);
  const dobaPojisteni = Math.max(0, dobaPojisteniRoky);
  const dopoctenaDoba = Math.max(0, dopoctenaDobaRoky);
  const dobaCelkem = dobaPojisteni + dopoctenaDoba;

  const procentniVymera = Math.max(
    vypoctovyZaklad * sazba * dobaCelkem,
    MIN_PROCENTNI_VYMERA,
  );
  const zakladniVymera = params.zakladniVymera;
  const duchodCelkem = procentniVymera + zakladniVymera;

  return {
    stupen,
    procentniVymera: Math.round(procentniVymera),
    zakladniVymera: Math.round(zakladniVymera),
    duchodCelkem: Math.round(duchodCelkem),
    sazbaPct: Math.round(sazba * 100 * 1000) / 1000,
    dobaPojisteniRoky: Math.round(dobaPojisteni * 100) / 100,
    dopoctenaDobaRoky: Math.round(dopoctenaDoba * 100) / 100,
  };
}
