import { useMemo, useReducer } from "react";
import {
  computeScenario,
  type IncomeType,
  type ScenarioResult,
  type StatePensionResult,
} from "../lib/pension";
import {
  PREDIKCE_VARIANTY,
  duchodovyVek,
  getParametry,
  toStatePensionResult,
  vypocet,
  vypocetInvalidni,
  type InvalidniVysledek,
  type Varianta,
  type VstupRok,
} from "../lib/pension-detailed";
import { statutoryRetirementAge } from "../lib/retirementAge";

export type CalculationMode = "approximation" | "detailed";

export interface DetailedYearRow {
  rok: number;
  vz: number;
  vylouceneDny: number;
  /**
   * Rok označený poradcem jako chybějící doba pojištění (studium, mateřská,
   * práce v zahraničí…). Bere se v potaz jen u řádků s `vz === 0` při
   * modelaci doplnění chybějících dob.
   */
  chybi?: boolean;
}

export interface DetailedInputs {
  rocniData: DetailedYearRow[];
  varianta: Varianta;
  pocetDeti: number;
  dnyPresluhovani: number;
  /** Zapnutí modelace „důchod po doplnění chybějících dob". */
  doplnitChybejici: boolean;
  /**
   * Souhrn evidovaných dnů pojištění z ČSSZ IVK (vč. náhradních dob).
   * Přesnější než počet let s nenulovým VZ — zachycuje částečné roky.
   */
  celkemDnyPojisteni?: number;
  /** Dny náhradních dob z IVK — do doby pojištění se krátí na 80 %. */
  nahradniDny?: number;
}

/** Odvozené orientační výstupy nad rámec hlavní gap analýzy. */
export interface PensionInsights {
  /** Zákonný důchodový věk (nárok na řádný starobní důchod). */
  zakonnyVek: { roky: number; mesice: number };
  /** Doba pojištění vstupující do výpočtu (evidovaná + projekce do odchodu). */
  dobaPojisteni?: {
    evidovanaRoky: number;
    projekceRoky: number;
    celkemRoky: number;
  };
  /** Srovnání důchodu podle dostupných dat vs. po doplnění chybějících dob. */
  doplneniDob?: {
    aktualni: StatePensionResult;
    poDoplneni: StatePensionResult;
    /** Rozdíl měsíčního důchodu v dnešní kupní síle (po − aktuální). */
    rozdil: number;
    pocetDoplnenych: number;
    prumernyVz: number;
  };
  /** Orientační invalidní důchod II. a III. stupně. */
  invalidni?: {
    st2: InvalidniVysledek;
    st3: InvalidniVysledek;
  };
}

export interface ClientInputs {
  // Sdílené pole napříč módy
  mode: CalculationMode;
  clientName: string;
  birthDate: string; // ISO yyyy-mm-dd
  gender: "male" | "female";
  plannedRetirementAge: number;
  replacementRate: number;
  withdrawalYears: number;
  accumulationYield: number;
  withdrawalYield: number;
  /** Inflace pro deflátor nominál → dnešní kupní síla. */
  inflation: number;
  currentSavings: number;

  // Approximation-specific
  incomeType: IncomeType;
  grossMonthly: number;
  yearsInsured: number;

  // Detailed-specific
  detailed: DetailedInputs;
}

const today = new Date();
const defaultBirthYear = today.getFullYear() - 40;
const defaultBirth = new Date(defaultBirthYear, 5, 15);

export const ROZHODNE_OBDOBI_OD = 1986;

function initialDetailedRows(currentYear: number): DetailedYearRow[] {
  const rows: DetailedYearRow[] = [];
  for (let r = ROZHODNE_OBDOBI_OD; r <= currentYear; r++) {
    rows.push({ rok: r, vz: 0, vylouceneDny: 0 });
  }
  return rows;
}

export const DEFAULT_INPUTS: ClientInputs = {
  mode: "detailed",
  clientName: "",
  birthDate: defaultBirth.toISOString().slice(0, 10),
  gender: "male",
  plannedRetirementAge: Math.round(statutoryRetirementAge(defaultBirthYear, "male")),
  replacementRate: 0.7,
  withdrawalYears: 20,
  accumulationYield: 0.05,
  withdrawalYield: 0.03,
  inflation: 0.03,
  currentSavings: 0,

  incomeType: "employee",
  grossMonthly: 50_000,
  yearsInsured: 18,

  detailed: {
    rocniData: initialDetailedRows(today.getFullYear()),
    varianta: "zakladni",
    pocetDeti: 0,
    dnyPresluhovani: 0,
    doplnitChybejici: false,
  },
};

type Action =
  | { type: "set"; patch: Partial<ClientInputs> }
  | { type: "setDetailed"; patch: Partial<DetailedInputs> }
  | { type: "setYear"; rok: number; patch: Partial<DetailedYearRow> }
  | { type: "fillAllYears"; vz: number }
  | { type: "reset" };

function reducer(state: ClientInputs, action: Action): ClientInputs {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "setDetailed":
      return { ...state, detailed: { ...state.detailed, ...action.patch } };
    case "setYear":
      return {
        ...state,
        detailed: {
          ...state.detailed,
          rocniData: state.detailed.rocniData.map((row) =>
            row.rok === action.rok ? { ...row, ...action.patch } : row,
          ),
        },
      };
    case "fillAllYears":
      return {
        ...state,
        detailed: {
          ...state.detailed,
          rocniData: state.detailed.rocniData.map((row) => ({
            ...row,
            vz: action.vz,
          })),
        },
      };
    case "reset":
      return DEFAULT_INPUTS;
  }
}

export function effectiveGrossMonthly(rocniData: DetailedYearRow[]): number {
  // Approx monthly gross = latest year's annual VZ ÷ 12. VZ is the
  // social-insurance assessment base — for employees it tracks gross
  // income, so this is a reasonable proxy for "current income" used
  // in the replacement-rate target calc.
  const filled = rocniData.filter((r) => r.vz > 0);
  if (filled.length === 0) return 0;
  filled.sort((a, b) => b.rok - a.rok);
  return Math.round(filled[0].vz / 12);
}

export function detailedYearsInsured(rocniData: DetailedYearRow[]): number {
  return rocniData.filter((r) => r.vz > 0).length;
}

export function useClientInputs() {
  const [inputs, dispatch] = useReducer(reducer, DEFAULT_INPUTS);

  const { result, effectiveGross, insights } = useMemo<{
    result: ScenarioResult;
    effectiveGross: number;
    insights?: PensionInsights;
  }>(() => {
    const birth = new Date(inputs.birthDate);
    const safeBirth = Number.isNaN(birth.getTime()) ? new Date(defaultBirth) : birth;
    const pohlavi = inputs.gender === "male" ? "M" : "Z";
    const pocetDeti = inputs.detailed.pocetDeti;

    let statePensionOverride;
    let effectiveGross = inputs.grossMonthly;
    let insights: PensionInsights | undefined;

    // Zákonný důchodový věk — bod 4. Počítáme v obou módech; v approximation
    // bez dětí (pole `pocetDeti` je jen v detailním módu).
    const zakonnyVek = duchodovyVek(
      safeBirth.getFullYear(),
      safeBirth.getMonth() + 1,
      pohlavi,
      inputs.mode === "detailed" ? pocetDeti : 0,
    );
    insights = { zakonnyVek };

    if (inputs.mode === "detailed") {
      const filledYears = detailedYearsInsured(inputs.detailed.rocniData);
      // Use the latest year's VZ as proxy for "current income" so target,
      // gap and capital all work off the user's real numbers, not the
      // (unused) approximation default.
      const derivedGross = effectiveGrossMonthly(inputs.detailed.rocniData);
      if (derivedGross > 0) effectiveGross = derivedGross;

      const ageNow =
        (Date.now() - safeBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      const yearsTo = Math.max(0, inputs.plannedRetirementAge - ageNow);
      const datumPriznani = new Date(
        new Date().getFullYear() + Math.round(yearsTo),
        safeBirth.getMonth(),
        Math.min(safeBirth.getDate(), 28),
      );
      // Roky s daty — vč. let jen s vyloučenými dny (náhradní doby z IVK),
      // aby se nulový VZ těchto let neředil do OVZ.
      const filledRows = inputs.detailed.rocniData
        .filter(
          (r) =>
            r.rok < datumPriznani.getFullYear() &&
            (r.vz > 0 || r.vylouceneDny > 0),
        )
        .map<VstupRok>((r) => ({
          rok: r.rok,
          vymerovaciZaklad: r.vz,
          vylouceneDny: r.vylouceneDny,
        }));
      const earningRows = filledRows.filter((r) => r.vymerovaciZaklad > 0);

      if (earningRows.length > 0) {
        const currentYear = new Date().getFullYear();

        // Projekce budoucí doby pojištění a příjmu do data odchodu — stejně
        // jako ČSSZ/konkurence předpokládáme, že klient pracuje dál. Poslední
        // známý VZ roste tempem zvolené predikční varianty.
        const rust = PREDIKCE_VARIANTY[inputs.detailed.varianta];
        const lastEarning = earningRows.reduce((a, b) => (b.rok > a.rok ? b : a));
        const knownYears = new Set(filledRows.map((r) => r.rok));
        const projRows: VstupRok[] = [];
        for (
          let r = Math.max(currentYear, lastEarning.rok + 1);
          r < datumPriznani.getFullYear();
          r++
        ) {
          if (knownYears.has(r)) continue;
          projRows.push({
            rok: r,
            vymerovaciZaklad: Math.round(
              lastEarning.vymerovaciZaklad *
                Math.pow(1 + rust, r - lastEarning.rok),
            ),
            vylouceneDny: 0,
          });
        }

        // Doba pojištění: preferuj souhrn dnů z ČSSZ IVK (zachycuje částečné
        // roky; náhradní doby krátíme na 80 % dle § 34), fallback = počet let
        // s nenulovým VZ. K tomu budoucí doba do data odchodu.
        const nd = inputs.detailed.nahradniDny ?? 0;
        const ivkDny = inputs.detailed.celkemDnyPojisteni;
        const evidovanaRoky =
          ivkDny && ivkDny > 0 ? (ivkDny - 0.2 * nd) / 365.25 : filledYears;
        const projekceRoky = Math.max(
          0,
          (datumPriznani.getTime() - Date.now()) /
            (365.25 * 24 * 60 * 60 * 1000),
        );
        const rokyPojisteni = Math.floor(evidovanaRoky + projekceRoky);
        insights.dobaPojisteni = {
          evidovanaRoky: Math.round(evidovanaRoky * 10) / 10,
          projekceRoky: Math.round(projekceRoky * 10) / 10,
          celkemRoky: rokyPojisteni,
        };

        const rowsProVypocet = [...filledRows, ...projRows];

        const v = vypocet({
          datumNarozeni: safeBirth,
          pohlavi,
          pocetDeti,
          datumPriznani,
          rokyPojisteni,
          dnyPresluhovani: inputs.detailed.dnyPresluhovani,
          rokyDat: rowsProVypocet,
          varianta: inputs.detailed.varianta,
        });
        statePensionOverride = toStatePensionResult(
          v,
          datumPriznani.getFullYear(),
          inputs.inflation,
        );

        // — Bod 3: doplnění chybějících dob pojištění —
        const prumernyVz = Math.round(
          earningRows.reduce((s, r) => s + r.vymerovaciZaklad, 0) /
            earningRows.length,
        );
        const chybejiciRoky = inputs.detailed.rocniData.filter(
          (r) =>
            r.chybi &&
            r.vz === 0 &&
            r.rok < datumPriznani.getFullYear(),
        );
        if (
          inputs.detailed.doplnitChybejici &&
          chybejiciRoky.length > 0 &&
          prumernyVz > 0
        ) {
          const filledRowsDoplneno: VstupRok[] = [
            ...rowsProVypocet,
            ...chybejiciRoky
              .filter((r) => !knownYears.has(r.rok))
              .map<VstupRok>((r) => ({
                rok: r.rok,
                vymerovaciZaklad: prumernyVz,
                vylouceneDny: r.vylouceneDny,
              })),
          ];
          const vDopl = vypocet({
            datumNarozeni: safeBirth,
            pohlavi,
            pocetDeti,
            datumPriznani,
            rokyPojisteni: rokyPojisteni + chybejiciRoky.length,
            dnyPresluhovani: inputs.detailed.dnyPresluhovani,
            rokyDat: filledRowsDoplneno,
            varianta: inputs.detailed.varianta,
          });
          const poDoplneni = toStatePensionResult(
            vDopl,
            datumPriznani.getFullYear(),
            inputs.inflation,
          );
          insights.doplneniDob = {
            aktualni: statePensionOverride,
            poDoplneni,
            rozdil: poDoplneni.monthly - statePensionOverride.monthly,
            pocetDoplnenych: chybejiciRoky.length,
            prumernyVz,
          };
        }

        // — Bod 5: invalidní důchod II. a III. stupně —
        // Výpočtový základ k DNEŠKU (invalidita vzniká nyní), bez projekce
        // budoucích let. Dopočtená doba = od dneška do důchodového věku.
        const invalidRows = filledRows.filter((r) => r.rok < currentYear);
        if (invalidRows.length > 0) {
          const dobaInvalidni = Math.max(1, Math.floor(evidovanaRoky));
          const vInv = vypocet({
            datumNarozeni: safeBirth,
            pohlavi,
            pocetDeti,
            datumPriznani: new Date(
              currentYear,
              safeBirth.getMonth(),
              Math.min(safeBirth.getDate(), 28),
            ),
            rokyPojisteni: dobaInvalidni,
            rokyDat: invalidRows,
            varianta: inputs.detailed.varianta,
          });
          const zakonnyVekRoky = zakonnyVek.roky + zakonnyVek.mesice / 12;
          const dopoctenaDoba = Math.max(0, zakonnyVekRoky - ageNow);
          const paramsNow = getParametry(currentYear, inputs.detailed.varianta);
          insights.invalidni = {
            st2: vypocetInvalidni(
              vInv.vypoctovyZaklad,
              dobaInvalidni,
              dopoctenaDoba,
              paramsNow,
              2,
            ),
            st3: vypocetInvalidni(
              vInv.vypoctovyZaklad,
              dobaInvalidni,
              dopoctenaDoba,
              paramsNow,
              3,
            ),
          };
        }
      }
    }

    const result = computeScenario({
      birthDate: safeBirth,
      gender: inputs.gender,
      incomeType: inputs.incomeType,
      grossMonthly: effectiveGross,
      yearsInsured: inputs.yearsInsured,
      plannedRetirementAge: inputs.plannedRetirementAge,
      replacementRate: inputs.replacementRate,
      withdrawalYears: inputs.withdrawalYears,
      accumulationYield: inputs.accumulationYield,
      withdrawalYield: inputs.withdrawalYield,
      currentSavings: inputs.currentSavings,
      statePensionOverride,
    });
    return { result, effectiveGross, insights };
  }, [inputs]);

  return {
    inputs,
    result,
    effectiveGross,
    insights,
    set: (patch: Partial<ClientInputs>) => dispatch({ type: "set", patch }),
    setDetailed: (patch: Partial<DetailedInputs>) =>
      dispatch({ type: "setDetailed", patch }),
    setYear: (rok: number, patch: Partial<DetailedYearRow>) =>
      dispatch({ type: "setYear", rok, patch }),
    fillAllYears: (vz: number) => dispatch({ type: "fillAllYears", vz }),
    reset: () => dispatch({ type: "reset" }),
  };
}
