import { describe, expect, it } from "vitest";
import { DEFAULT_INFLATION, deflateToToday, duchodovyVek, getParametry } from "./parameters";
import { vypocet, type VstupRok } from "./calculator";
import { toStatePensionResult } from "./adapter";

describe("getParametry 2026", () => {
  it("matches Python parameters", () => {
    const p = getParametry(2026);
    expect(p.zakladniVymera).toBe(4900);
    expect(p.redukce1).toBe(21546);
    expect(p.redukce2).toBe(195868);
    expect(p.zapocetDo1).toBe(0.99);
    expect(p.procentoZaRok).toBe(0.01495);
    expect(p.minDuchod).toBe(9800);
  });

  it("extrapolates for 2030+", () => {
    const p = getParametry(2030, "zakladni");
    expect(p.prumernaMzda).toBeGreaterThan(48967);
    expect(p.zakladniVymera).toBeGreaterThan(4900);
    expect(p.procentoZaRok).toBeCloseTo(0.01475, 5);
  });
});

describe("duchodovyVek", () => {
  it("muz 1971+ = 65y0m", () => {
    expect(duchodovyVek(1971, 6, "M", 0)).toEqual({ roky: 65, mesice: 0 });
  });

  it("zena 1972 with children = 65y0m (ročník 1971+)", () => {
    expect(duchodovyVek(1972, 1, "Z", 3)).toEqual({ roky: 65, mesice: 0 });
  });

  it("muz 1960 (pre-1965)", () => {
    expect(duchodovyVek(1960, 6, "M", 0)).toEqual({ roky: 64, mesice: 0 });
  });

  it("zena 1965 0 children = 65y0m", () => {
    expect(duchodovyVek(1965, 1, "Z", 0)).toEqual({ roky: 65, mesice: 0 });
  });

  it("zena 1965 3 children = 64y4m (redukce 8 mesicu)", () => {
    expect(duchodovyVek(1965, 1, "Z", 3)).toEqual({ roky: 64, mesice: 4 });
  });
});

describe("vypocet — Python parity", () => {
  function roky(start: number, end: number, vz: number): VstupRok[] {
    const out: VstupRok[] = [];
    for (let r = start; r < end; r++) out.push({ rok: r, vymerovaciZaklad: vz });
    return out;
  }

  it("zakladni: muz 1961, VZ 600k/rok, 44 let pojistku", () => {
    const v = vypocet({
      datumNarozeni: new Date(1961, 0, 15),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2026, 1, 1),
      rokyPojisteni: 44,
      rokyDat: roky(1986, 2026, 600000),
    });
    // Python ref: ovz=241611.9, vpz=66654.26, procentni=43845, duchod=48745
    expect(v.osobniVymerovaciZaklad).toBeCloseTo(241611.9, 0);
    expect(v.vypoctovyZaklad).toBeCloseTo(66654.26, 0);
    expect(Math.abs(v.duchodCelkem - 48745)).toBeLessThan(2);
    expect(v.zakladniVymera).toBe(4900);
    expect(v.jePredcasny).toBe(false);
  });

  it("predcasny: muz 1962, VZ 400k/rok, 42 let, priznani pred DV", () => {
    const v = vypocet({
      datumNarozeni: new Date(1962, 5, 1),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2026, 5, 1),
      rokyPojisteni: 42,
      rokyDat: roky(1986, 2026, 400000),
    });
    // Python ref: ovz=161074.6, duchod=39344, je_predcasny=True, dny=122, sleva=3.0%
    expect(v.osobniVymerovaciZaklad).toBeCloseTo(161074.6, 0);
    expect(v.jePredcasny).toBe(true);
    expect(v.dnyPredcasnosti).toBeGreaterThan(0);
    expect(v.slevaZaPredcasnostPct).toBeGreaterThan(0);
    expect(Math.abs(v.duchodCelkem - 39344)).toBeLessThan(2);
  });

  it("minimalni: VZ 10k/rok → uplatni se min duchod 9800", () => {
    const v = vypocet({
      datumNarozeni: new Date(1961, 0, 15),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2026, 1, 1),
      rokyPojisteni: 35,
      rokyDat: roky(1986, 2026, 10000),
    });
    expect(v.duchodCelkem).toBeGreaterThanOrEqual(9800);
  });

  it("stredni: muz 1965, VZ 600k/rok 30 let, priznani 2030", () => {
    const v = vypocet({
      datumNarozeni: new Date(1965, 0, 15),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2030, 1, 1),
      rokyPojisteni: 30,
      rokyDat: roky(2000, 2030, 600000),
    });
    // Python ref: ovz=73751.42, duchod=21909
    expect(v.osobniVymerovaciZaklad).toBeCloseTo(73751.42, 0);
    expect(Math.abs(v.duchodCelkem - 21909)).toBeLessThan(3);
  });

  it("returns sensible podrobnosti", () => {
    const v = vypocet({
      datumNarozeni: new Date(1961, 0, 15),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2026, 1, 1),
      rokyPojisteni: 44,
      rokyDat: roky(1986, 2026, 600000),
    });
    expect(v.podrobnosti.rocniDetaily).toHaveLength(40); // 1986..2025
    expect(v.podrobnosti.pocetKalDnu).toBeGreaterThan(40 * 365);
    expect(v.podrobnosti.redukce1).toBe(21546);
  });
});

describe("deflateToToday", () => {
  it("returns input unchanged when rok <= dnes", () => {
    expect(deflateToToday(100_000, 2026, 2026, 0.02)).toBe(100_000);
    expect(deflateToToday(100_000, 2020, 2026, 0.02)).toBe(100_000);
  });

  it("matches Python na_dnesni_kupni_silu reference (2050, 2% p.a.)", () => {
    // (1.02)^24 ≈ 1.6084 → 100000 / 1.6084 ≈ 62 172
    const out = deflateToToday(100_000, 2050, 2026, 0.02);
    expect(out).toBeCloseTo(62_172, -1); // within ~5 Kč
  });

  it("conservative 3% deflates more aggressively than 2%", () => {
    const at2 = deflateToToday(100_000, 2050, 2026, 0.02);
    const at3 = deflateToToday(100_000, 2050, 2026, 0.03);
    expect(at3).toBeLessThan(at2);
  });

  it("default inflation is 3%", () => {
    expect(DEFAULT_INFLATION).toBe(0.03);
  });
});

describe("toStatePensionResult adapter", () => {
  function makeVstup(): Parameters<typeof vypocet>[0] {
    return {
      datumNarozeni: new Date(1985, 5, 15),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2050, 5, 15),
      rokyPojisteni: 30,
      rokyDat: Array.from({ length: 30 }, (_, i) => ({
        rok: 1996 + i,
        vymerovaciZaklad: 600_000,
      })),
    };
  }

  it("nominal == today when rokPriznani == today", () => {
    const v = vypocet({ ...makeVstup(), datumPriznani: new Date(2026, 5, 15) });
    const r = toStatePensionResult(v, 2026, 0.03, 2026);
    expect(r.monthly).toBe(r.monthlyNominal);
    expect(r.basicComponent).toBe(r.basicComponentNominal);
  });

  it("today's value < nominal for future rokPriznani", () => {
    const v = vypocet(makeVstup());
    const r = toStatePensionResult(v, 2050, 0.03, 2026);
    expect(r.monthly).toBeLessThan(r.monthlyNominal);
    expect(r.basicComponent).toBeLessThan(r.basicComponentNominal);
    expect(r.percentageComponent).toBeLessThan(r.percentageComponentNominal);
  });

  it("higher inflation → lower today value (more aggressive deflation)", () => {
    const v = vypocet(makeVstup());
    const at2 = toStatePensionResult(v, 2050, 0.02, 2026);
    const at4 = toStatePensionResult(v, 2050, 0.04, 2026);
    expect(at4.monthly).toBeLessThan(at2.monthly);
    // Nominal stays same regardless of inflation
    expect(at4.monthlyNominal).toBe(at2.monthlyNominal);
  });

  it("rokPriznani propagates from arg to result", () => {
    const v = vypocet(makeVstup());
    const r = toStatePensionResult(v, 2050, 0.03);
    expect(r.rokPriznani).toBe(2050);
  });
});
