import { useMemo, useReducer } from "react";
import {
  computeScenario,
  type IncomeType,
  type ScenarioResult,
} from "../lib/pension";
import {
  toStatePensionResult,
  vypocet,
  type Varianta,
  type VstupRok,
} from "../lib/pension-detailed";
import { statutoryRetirementAge } from "../lib/retirementAge";

export type CalculationMode = "approximation" | "detailed";

export interface DetailedYearRow {
  rok: number;
  vz: number;
  vylouceneDny: number;
}

export interface DetailedInputs {
  rocniData: DetailedYearRow[];
  varianta: Varianta;
  pocetDeti: number;
  dnyPresluhovani: number;
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
  plannedRetirementAge: statutoryRetirementAge(defaultBirthYear, "male"),
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

  const { result, effectiveGross } = useMemo<{
    result: ScenarioResult;
    effectiveGross: number;
  }>(() => {
    const birth = new Date(inputs.birthDate);
    const safeBirth = Number.isNaN(birth.getTime()) ? new Date(defaultBirth) : birth;

    let statePensionOverride;
    let effectiveGross = inputs.grossMonthly;

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
      const filledRows = inputs.detailed.rocniData
        .filter((r) => r.rok < datumPriznani.getFullYear() && r.vz > 0)
        .map<VstupRok>((r) => ({
          rok: r.rok,
          vymerovaciZaklad: r.vz,
          vylouceneDny: r.vylouceneDny,
        }));

      if (filledRows.length > 0) {
        const v = vypocet({
          datumNarozeni: safeBirth,
          pohlavi: inputs.gender === "male" ? "M" : "Z",
          pocetDeti: inputs.detailed.pocetDeti,
          datumPriznani,
          rokyPojisteni: Math.max(filledYears, filledRows.length),
          dnyPresluhovani: inputs.detailed.dnyPresluhovani,
          rokyDat: filledRows,
          varianta: inputs.detailed.varianta,
        });
        statePensionOverride = toStatePensionResult(
          v,
          datumPriznani.getFullYear(),
          inputs.inflation,
        );
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
    return { result, effectiveGross };
  }, [inputs]);

  return {
    inputs,
    result,
    effectiveGross,
    set: (patch: Partial<ClientInputs>) => dispatch({ type: "set", patch }),
    setDetailed: (patch: Partial<DetailedInputs>) =>
      dispatch({ type: "setDetailed", patch }),
    setYear: (rok: number, patch: Partial<DetailedYearRow>) =>
      dispatch({ type: "setYear", rok, patch }),
    fillAllYears: (vz: number) => dispatch({ type: "fillAllYears", vz }),
    reset: () => dispatch({ type: "reset" }),
  };
}
