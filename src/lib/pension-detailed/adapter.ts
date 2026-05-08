/**
 * Adapter mezi detailním engine (`Vysledek`) a sjednoceným tvarem
 * `StatePensionResult`, který používá zbytek aplikace (gap, kapitál,
 * krok 2). Díky tomu krok 2 nepotřebuje vědět nic o tom, který engine
 * důchod spočítal.
 */

import type { StatePensionResult } from "../pension";
import type { Vysledek } from "./calculator";

export function toStatePensionResult(v: Vysledek): StatePensionResult {
  return {
    monthly: v.duchodCelkem,
    basicComponent: v.zakladniVymera,
    percentageComponent: v.procentniVymera,
    reducedBase: v.vypoctovyZaklad,
  };
}
