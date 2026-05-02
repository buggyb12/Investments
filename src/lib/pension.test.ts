import { describe, expect, it } from "vitest";
import {
  PENSION_PARAMS_2025,
  estimateStatePension,
  monthlyContribution,
  monthlyGap,
  reduceAssessmentBase,
  requiredCapital,
} from "./pension";

describe("reduceAssessmentBase", () => {
  it("returns 0 for non-positive base", () => {
    expect(reduceAssessmentBase(0)).toBe(0);
    expect(reduceAssessmentBase(-100)).toBe(0);
  });

  it("returns full amount below first reduction limit", () => {
    expect(reduceAssessmentBase(15_000)).toBe(15_000);
  });

  it("applies 26% above first reduction limit", () => {
    const r1 = PENSION_PARAMS_2025.firstReductionLimit;
    const base = r1 + 10_000;
    expect(reduceAssessmentBase(base)).toBeCloseTo(r1 + 10_000 * 0.26, 2);
  });

  it("caps at second reduction limit", () => {
    const { firstReductionLimit: r1, secondReductionLimit: r2 } = PENSION_PARAMS_2025;
    const cappedAtR2 = r1 + (r2 - r1) * 0.26;
    expect(reduceAssessmentBase(r2)).toBeCloseTo(cappedAtR2, 2);
    expect(reduceAssessmentBase(r2 + 100_000)).toBeCloseTo(cappedAtR2, 2);
  });
});

describe("estimateStatePension", () => {
  it("returns zero for no work years", () => {
    const r = estimateStatePension({
      grossMonthly: 50_000,
      yearsInsured: 0,
      incomeType: "employee",
    });
    expect(r.monthly).toBe(0);
  });

  it("includes basic component plus percentage component for employee", () => {
    const r = estimateStatePension({
      grossMonthly: 50_000,
      yearsInsured: 40,
      incomeType: "employee",
    });
    expect(r.basicComponent).toBe(PENSION_PARAMS_2025.basicComponent);
    expect(r.monthly).toBeGreaterThan(PENSION_PARAMS_2025.basicComponent);
    // 40 years × 1.5% × reduced base — should land in believable range
    expect(r.monthly).toBeGreaterThan(15_000);
    expect(r.monthly).toBeLessThan(35_000);
  });

  it("OSVČ pension is materially lower than employee with same gross", () => {
    const employee = estimateStatePension({
      grossMonthly: 50_000,
      yearsInsured: 30,
      incomeType: "employee",
    });
    const osvc = estimateStatePension({
      grossMonthly: 50_000,
      yearsInsured: 30,
      incomeType: "selfEmployed",
    });
    expect(osvc.monthly).toBeLessThan(employee.monthly);
  });
});

describe("monthlyGap", () => {
  it("never returns negative", () => {
    expect(monthlyGap(20_000, 25_000)).toBe(0);
  });

  it("returns difference when target exceeds pension", () => {
    expect(monthlyGap(35_000, 18_000)).toBe(17_000);
  });
});

describe("requiredCapital", () => {
  it("equals gap × months when yield is zero", () => {
    expect(requiredCapital(10_000, 20, 0)).toBe(10_000 * 20 * 12);
  });

  it("is lower than zero-yield case when yield > 0", () => {
    const zero = requiredCapital(10_000, 20, 0);
    const withYield = requiredCapital(10_000, 20, 0.03);
    expect(withYield).toBeLessThan(zero);
    expect(withYield).toBeGreaterThan(zero * 0.7);
  });

  it("returns 0 for zero gap", () => {
    expect(requiredCapital(0, 20, 0.03)).toBe(0);
  });
});

describe("monthlyContribution", () => {
  it("returns 0 if existing savings already cover target", () => {
    const target = 1_000_000;
    // Savings that grow to >= target with no contribution
    const pmt = monthlyContribution(target, 30, 0.05, 1_000_000);
    expect(pmt).toBe(0);
  });

  it("FV of computed PMT equals target capital (round-trip)", () => {
    const target = 3_500_000;
    const years = 30;
    const yieldRate = 0.05;
    const pmt = monthlyContribution(target, years, yieldRate, 0);

    // FV annuity formula
    const n = years * 12;
    const r = yieldRate / 12;
    const fv = pmt * ((Math.pow(1 + r, n) - 1) / r);
    expect(fv).toBeCloseTo(target, 0);
  });

  it("higher yield → lower required PMT", () => {
    const target = 3_500_000;
    const lowYield = monthlyContribution(target, 30, 0.02, 0);
    const highYield = monthlyContribution(target, 30, 0.07, 0);
    expect(highYield).toBeLessThan(lowYield);
  });
});
