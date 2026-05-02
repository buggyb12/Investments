import { useMemo, useReducer } from "react";
import {
  computeScenario,
  type IncomeType,
  type ScenarioResult,
} from "../lib/pension";
import { statutoryRetirementAge } from "../lib/retirementAge";

export interface ClientInputs {
  clientName: string;
  birthDate: string; // ISO yyyy-mm-dd
  gender: "male" | "female";
  incomeType: IncomeType;
  grossMonthly: number;
  yearsInsured: number;
  plannedRetirementAge: number;
  replacementRate: number; // 0..1
  withdrawalYears: number;
  accumulationYield: number; // 0..1
  withdrawalYield: number; // 0..1
  currentSavings: number;
}

const today = new Date();
const defaultBirthYear = today.getFullYear() - 40;
const defaultBirth = new Date(defaultBirthYear, 5, 15);

export const DEFAULT_INPUTS: ClientInputs = {
  clientName: "",
  birthDate: defaultBirth.toISOString().slice(0, 10),
  gender: "male",
  incomeType: "employee",
  grossMonthly: 50_000,
  yearsInsured: 18,
  plannedRetirementAge: statutoryRetirementAge(defaultBirthYear, "male"),
  replacementRate: 0.7,
  withdrawalYears: 20,
  accumulationYield: 0.05,
  withdrawalYield: 0.03,
  currentSavings: 0,
};

type Action = { type: "set"; patch: Partial<ClientInputs> } | { type: "reset" };

function reducer(state: ClientInputs, action: Action): ClientInputs {
  switch (action.type) {
    case "set":
      return { ...state, ...action.patch };
    case "reset":
      return DEFAULT_INPUTS;
  }
}

export function useClientInputs() {
  const [inputs, dispatch] = useReducer(reducer, DEFAULT_INPUTS);

  const result: ScenarioResult = useMemo(() => {
    const birth = new Date(inputs.birthDate);
    return computeScenario({
      birthDate: Number.isNaN(birth.getTime())
        ? new Date(defaultBirth)
        : birth,
      gender: inputs.gender,
      incomeType: inputs.incomeType,
      grossMonthly: inputs.grossMonthly,
      yearsInsured: inputs.yearsInsured,
      plannedRetirementAge: inputs.plannedRetirementAge,
      replacementRate: inputs.replacementRate,
      withdrawalYears: inputs.withdrawalYears,
      accumulationYield: inputs.accumulationYield,
      withdrawalYield: inputs.withdrawalYield,
      currentSavings: inputs.currentSavings,
    });
  }, [inputs]);

  return {
    inputs,
    result,
    set: (patch: Partial<ClientInputs>) => dispatch({ type: "set", patch }),
    reset: () => dispatch({ type: "reset" }),
  };
}
