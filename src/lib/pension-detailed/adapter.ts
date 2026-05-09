/**
 * Adapter mezi detailním engine (`Vysledek`) a sjednoceným tvarem
 * `StatePensionResult`.
 *
 * Detailní engine vrací NOMINÁLNÍ částky v korunách roku přiznání důchodu
 * (parametry MPSV se extrapolují podle predikční varianty). Adapter
 * deflátuje nominál na DNEŠNÍ kupní sílu pomocí `deflateToToday`. Oba
 * pohledy zachovává v jednom objektu — `monthly` (= dnešní) teče do
 * gap/kapitál/úložky, `monthlyNominal` se ukazuje klientovi jako "v
 * korunách roku přiznání".
 */

import type { StatePensionResult } from "../pension";
import type { Vysledek } from "./calculator";
import { DEFAULT_INFLATION, ROK_DNES, deflateToToday } from "./parameters";

export function toStatePensionResult(
  v: Vysledek,
  rokPriznani: number,
  inflation: number = DEFAULT_INFLATION,
  rokDnes: number = ROK_DNES,
): StatePensionResult {
  const deflate = (amount: number) =>
    deflateToToday(amount, rokPriznani, rokDnes, inflation);

  return {
    monthly: deflate(v.duchodCelkem),
    basicComponent: deflate(v.zakladniVymera),
    percentageComponent: deflate(v.procentniVymera),
    reducedBase: v.vypoctovyZaklad, // referenční, neukazujeme klientovi
    monthlyNominal: v.duchodCelkem,
    basicComponentNominal: v.zakladniVymera,
    percentageComponentNominal: v.procentniVymera,
    rokPriznani,
  };
}
