/**
 * Orientační výpočet invalidního důchodu (II. a III. stupně) dle
 * § 41–42 zákona č. 155/1995 Sb.
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
 * Minimum procentní výměry = 770 Kč; základní výměra je shodná se starobním.
 *
 * Jde o orientační odhad pro poradenskou diskusi, nikoli závazný výpočet ČSSZ.
 */

import type { RokParametry } from "./parameters";

export type StupenInvalidity = 2 | 3;

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
  return stupen === 3 ? 0.015 : 0.0075;
}

/**
 * Spočítá orientační výši invalidního důchodu daného stupně.
 *
 * @param vypoctovyZaklad redukovaný osobní vyměřovací základ (z engine)
 * @param dobaPojisteniRoky získané roky pojištění do vzniku invalidity
 * @param dopoctenaDobaRoky doba od vzniku invalidity do důchodového věku
 * @param params parametry roku přiznání (základní výměra apod.)
 * @param stupen II. nebo III. stupeň invalidity
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
