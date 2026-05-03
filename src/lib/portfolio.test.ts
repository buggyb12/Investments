import { describe, expect, it } from "vitest";
import {
  FUND_ORDER,
  PROFILES,
  adjustAllocation,
  pickProfileByYears,
  pickProfileByYield,
  portfolioMetrics,
  splitMonthlyContribution,
  type Allocation,
} from "./portfolio";

describe("PROFILES", () => {
  it("each profile sums to 1.0", () => {
    for (const profile of Object.values(PROFILES)) {
      const sum = FUND_ORDER.reduce((s, id) => s + profile.allocation[id], 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it("growth profile has higher expected return than conservative", () => {
    const growth = portfolioMetrics(PROFILES.growth.allocation);
    const conservative = portfolioMetrics(PROFILES.conservative.allocation);
    expect(growth.expectedReturn).toBeGreaterThan(conservative.expectedReturn);
  });

  it("conservative profile has lower SRI than growth", () => {
    const growth = portfolioMetrics(PROFILES.growth.allocation);
    const conservative = portfolioMetrics(PROFILES.conservative.allocation);
    expect(conservative.weightedSRI).toBeLessThan(growth.weightedSRI);
  });
});

describe("pickProfileByYears", () => {
  it("picks conservative for short horizon", () => {
    expect(pickProfileByYears(5)).toBe("conservative");
  });
  it("picks balanced for medium horizon", () => {
    expect(pickProfileByYears(15)).toBe("balanced");
  });
  it("picks growth for long horizon", () => {
    expect(pickProfileByYears(30)).toBe("growth");
  });
});

describe("pickProfileByYield", () => {
  it("low yield target picks conservative", () => {
    expect(pickProfileByYield(0.03)).toBe("conservative");
  });
  it("high yield target picks growth", () => {
    expect(pickProfileByYield(0.08)).toBe("growth");
  });
});

describe("adjustAllocation", () => {
  const start: Allocation = { aggh: 0.25, vwce: 0.25, cspx: 0.25, sgln: 0.25 };

  it("preserves sum = 1 when increasing one fund", () => {
    const next = adjustAllocation(start, "cspx", 0.5);
    const sum = FUND_ORDER.reduce((s, id) => s + next[id], 0);
    expect(sum).toBeCloseTo(1, 6);
    expect(next.cspx).toBeCloseTo(0.5, 6);
  });

  it("redistributes proportionally to other funds' current weights", () => {
    const skewed: Allocation = { aggh: 0.4, vwce: 0.4, cspx: 0.1, sgln: 0.1 };
    const next = adjustAllocation(skewed, "aggh", 0.6);
    // remaining 0.4 split among others proportionally to their share of 0.6
    expect(next.aggh).toBeCloseTo(0.6, 6);
    expect(next.vwce / next.cspx).toBeCloseTo(0.4 / 0.1, 6);
  });

  it("clamps to [0, 1]", () => {
    const high = adjustAllocation(start, "cspx", 1.5);
    expect(high.cspx).toBe(1);
    expect(high.aggh).toBe(0);

    const low = adjustAllocation(start, "cspx", -0.3);
    expect(low.cspx).toBe(0);
  });

  it("handles when others were all zero (split remainder equally)", () => {
    const allOnOne: Allocation = { aggh: 1, vwce: 0, cspx: 0, sgln: 0 };
    const next = adjustAllocation(allOnOne, "aggh", 0.5);
    expect(next.aggh).toBeCloseTo(0.5, 6);
    expect(next.vwce).toBeCloseTo(0.5 / 3, 6);
    expect(next.cspx).toBeCloseTo(0.5 / 3, 6);
    expect(next.sgln).toBeCloseTo(0.5 / 3, 6);
  });
});

describe("portfolioMetrics", () => {
  it("uniform allocation produces averages of fund stats", () => {
    const uniform: Allocation = { aggh: 0.25, vwce: 0.25, cspx: 0.25, sgln: 0.25 };
    const m = portfolioMetrics(uniform);
    expect(m.expectedReturn).toBeGreaterThan(0);
    expect(m.weightedTER).toBeGreaterThan(0);
    expect(m.weightedSRI).toBeGreaterThan(2);
    expect(m.weightedSRI).toBeLessThan(5);
  });
});

describe("splitMonthlyContribution", () => {
  it("splits proportionally to allocation", () => {
    const split = splitMonthlyContribution(10_000, {
      aggh: 0.5,
      vwce: 0.2,
      cspx: 0.2,
      sgln: 0.1,
    });
    expect(split.aggh).toBeCloseTo(5000, 6);
    expect(split.vwce).toBeCloseTo(2000, 6);
    expect(split.cspx).toBeCloseTo(2000, 6);
    expect(split.sgln).toBeCloseTo(1000, 6);
  });
});
