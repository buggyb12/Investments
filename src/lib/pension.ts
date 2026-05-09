/**
 * Orientační výpočty důchodu a kapitálových potřeb.
 *
 * Pravidla vycházejí ze zákona 155/1995 Sb. a parametrů MPSV pro rok 2025.
 * Veškeré výpočty jsou ZJEDNODUŠENÉ a slouží pro klientskou prezentaci,
 * NE jako závazný výpočet ČSSZ.
 */

export type IncomeType = "employee" | "selfEmployed" | "businessOwner";

export const PENSION_PARAMS_2025 = {
  /** Základní výměra důchodu (Kč/měsíc) */
  basicComponent: 4660,
  /** První redukční hranice — do této částky se započítává 100 % */
  firstReductionLimit: 17_743,
  /** Druhá redukční hranice — mezi RH1 a RH2 se započítává 26 % */
  secondReductionLimit: 161_296,
  /** Procentní sazba za rok pojištění */
  yearlyAccrualRate: 0.015,
} as const;

/**
 * Aplikace redukčních hranic na měsíční vyměřovací základ.
 * Vrací redukovaný osobní vyměřovací základ (OVZ).
 */
export function reduceAssessmentBase(monthlyBase: number): number {
  const { firstReductionLimit: r1, secondReductionLimit: r2 } = PENSION_PARAMS_2025;
  if (monthlyBase <= 0) return 0;
  if (monthlyBase <= r1) return monthlyBase;
  if (monthlyBase <= r2) return r1 + (monthlyBase - r1) * 0.26;
  return r1 + (r2 - r1) * 0.26;
}

/**
 * Vyměřovací základ pro účely důchodu podle typu příjmu.
 * - Zaměstnanec: hrubá mzda
 * - OSVČ: typicky 50 % zisku (mnozí platí jen z minima)
 * - Podnikatel (s.r.o. apod.): bereme jako kombinaci, default 70 %
 */
export function assessmentBaseForIncomeType(
  grossMonthly: number,
  incomeType: IncomeType,
): number {
  switch (incomeType) {
    case "employee":
      return grossMonthly;
    case "selfEmployed":
      return grossMonthly * 0.5;
    case "businessOwner":
      return grossMonthly * 0.7;
  }
}

export interface StatePensionInput {
  grossMonthly: number;
  yearsInsured: number;
  incomeType: IncomeType;
}

export interface StatePensionResult {
  /** V dnešní kupní síle. Tato hodnota teče dál do gap/kapitál/úložky. */
  monthly: number;
  basicComponent: number;
  percentageComponent: number;
  reducedBase: number;
  /**
   * Nominální v korunách roku přiznání důchodu. V approximation módu
   * (parametry 2025) = monthly. V detailním módu může být výrazně vyšší
   * pro klienty s dlouhým horizontem.
   */
  monthlyNominal: number;
  basicComponentNominal: number;
  percentageComponentNominal: number;
  /** Rok, ve kterém klient dosáhne důchodového věku (= rok přiznání). */
  rokPriznani: number;
}

/**
 * Orientační odhad měsíčního starobního důchodu.
 * Bere současný příjem jako proxy pro celoživotní vyměřovací základ —
 * zjednodušení, ale dostatečné pro klientskou diskusi.
 */
export function estimateStatePension(input: StatePensionInput): StatePensionResult {
  const { grossMonthly, yearsInsured, incomeType } = input;
  const { basicComponent, yearlyAccrualRate } = PENSION_PARAMS_2025;

  const rokPriznaniDefault = new Date().getFullYear();

  if (yearsInsured <= 0 || grossMonthly <= 0) {
    return {
      monthly: 0,
      basicComponent: 0,
      percentageComponent: 0,
      reducedBase: 0,
      monthlyNominal: 0,
      basicComponentNominal: 0,
      percentageComponentNominal: 0,
      rokPriznani: rokPriznaniDefault,
    };
  }

  const base = assessmentBaseForIncomeType(grossMonthly, incomeType);
  const reducedBase = reduceAssessmentBase(base);
  const percentageComponent = reducedBase * yearlyAccrualRate * yearsInsured;
  const monthly = basicComponent + percentageComponent;

  // Approximation uses 2025 parameters → result is in today's CZK, so
  // nominal == monthly. The detailed engine produces the divergence.
  return {
    monthly,
    basicComponent,
    percentageComponent,
    reducedBase,
    monthlyNominal: monthly,
    basicComponentNominal: basicComponent,
    percentageComponentNominal: percentageComponent,
    rokPriznani: rokPriznaniDefault,
  };
}

/**
 * Cílový měsíční příjem v důchodu pro zachování životní úrovně.
 */
export function targetRetirementIncome(
  currentGrossMonthly: number,
  replacementRate: number,
): number {
  return Math.max(0, currentGrossMonthly * replacementRate);
}

/**
 * Měsíční rozdíl, který si klient musí pokrýt z vlastních zdrojů.
 */
export function monthlyGap(targetIncome: number, statePension: number): number {
  return Math.max(0, targetIncome - statePension);
}

/**
 * Potřebný kapitál v okamžiku odchodu do důchodu.
 * Present value annuity: kapitál, ze kterého lze měsíčně čerpat `monthlyAmount`
 * po dobu `withdrawalYears` při ročním výnosu `annualYield`.
 */
export function requiredCapital(
  monthlyAmount: number,
  withdrawalYears: number,
  annualYield: number,
): number {
  const n = withdrawalYears * 12;
  const r = annualYield / 12;
  if (n <= 0 || monthlyAmount <= 0) return 0;
  if (r === 0) return monthlyAmount * n;
  return (monthlyAmount * (1 - Math.pow(1 + r, -n))) / r;
}

/**
 * Měsíční úložka potřebná k akumulaci `targetCapital` za `yearsToRetirement`,
 * při ročním výnosu během akumulace, s ohledem na již existující úspory.
 */
export function monthlyContribution(
  targetCapital: number,
  yearsToRetirement: number,
  annualYield: number,
  currentSavings: number = 0,
): number {
  const n = yearsToRetirement * 12;
  const r = annualYield / 12;
  if (n <= 0) return Number.POSITIVE_INFINITY;

  const fvOfExisting =
    r === 0 ? currentSavings : currentSavings * Math.pow(1 + r, n);
  const fvNeeded = Math.max(0, targetCapital - fvOfExisting);

  if (fvNeeded === 0) return 0;
  if (r === 0) return fvNeeded / n;
  return (fvNeeded * r) / (Math.pow(1 + r, n) - 1);
}

export interface ProjectionPoint {
  year: number;
  yearsFromNow: number;
  value: number;
}

/**
 * Pro graf: hodnota kapitálu na konci každého roku během akumulace.
 */
export function projectCapital(
  currentSavings: number,
  monthlyPayment: number,
  yearsToRetirement: number,
  annualYield: number,
  startYear: number = new Date().getFullYear(),
): ProjectionPoint[] {
  const r = annualYield / 12;
  const totalYears = Math.max(0, Math.ceil(yearsToRetirement));
  const points: ProjectionPoint[] = [];
  let value = currentSavings;

  points.push({ year: startYear, yearsFromNow: 0, value });

  for (let y = 1; y <= totalYears; y++) {
    for (let m = 0; m < 12; m++) {
      value = value * (1 + r) + monthlyPayment;
    }
    points.push({ year: startYear + y, yearsFromNow: y, value });
  }

  return points;
}

export interface ScenarioInput {
  birthDate: Date;
  gender: "male" | "female";
  incomeType: IncomeType;
  grossMonthly: number;
  yearsInsured: number;
  plannedRetirementAge: number;
  replacementRate: number;
  withdrawalYears: number;
  accumulationYield: number;
  withdrawalYield: number;
  currentSavings: number;
  /**
   * Optional. When set, computeScenario uses this as the state pension
   * instead of running its own approximation. Lets a caller plug in a
   * different engine (e.g. the detailed ČSSZ-coefficient calculator)
   * without changing the rest of the gap/capital pipeline.
   */
  statePensionOverride?: StatePensionResult;
}

export interface ScenarioResult {
  yearsToRetirement: number;
  statePension: StatePensionResult;
  targetIncome: number;
  monthlyGap: number;
  requiredCapital: number;
  monthlyContribution: number;
  /** Future value of currentSavings at retirement (compounded at accumulationYield). */
  existingSavingsFutureValue: number;
  /** True when existingSavingsFutureValue >= requiredCapital and capital > 0. */
  coveredByExistingSavings: boolean;
  projection: ProjectionPoint[];
}

export function computeScenario(input: ScenarioInput): ScenarioResult {
  const ageNow =
    (Date.now() - input.birthDate.getTime()) /
    (365.25 * 24 * 60 * 60 * 1000);
  const yearsToRetirement = Math.max(0, input.plannedRetirementAge - ageNow);

  const statePension =
    input.statePensionOverride ??
    estimateStatePension({
      grossMonthly: input.grossMonthly,
      yearsInsured: input.yearsInsured,
      incomeType: input.incomeType,
    });

  const targetIncome = targetRetirementIncome(
    input.grossMonthly,
    input.replacementRate,
  );
  const gap = monthlyGap(targetIncome, statePension.monthly);
  const capital = requiredCapital(
    gap,
    input.withdrawalYears,
    input.withdrawalYield,
  );
  const contribution = monthlyContribution(
    capital,
    yearsToRetirement,
    input.accumulationYield,
    input.currentSavings,
  );

  const r = input.accumulationYield / 12;
  const n = yearsToRetirement * 12;
  const existingSavingsFutureValue =
    r === 0 ? input.currentSavings : input.currentSavings * Math.pow(1 + r, n);

  const projection = projectCapital(
    input.currentSavings,
    contribution,
    yearsToRetirement,
    input.accumulationYield,
  );

  return {
    yearsToRetirement,
    statePension,
    targetIncome,
    monthlyGap: gap,
    requiredCapital: capital,
    monthlyContribution: contribution,
    existingSavingsFutureValue,
    coveredByExistingSavings: capital > 0 && existingSavingsFutureValue >= capital,
    projection,
  };
}
