import { describe, expect, it } from "vitest";
import { getParametry } from "./parameters";
import { sazbaProStupen, vypocetInvalidni } from "./disability";

const params = getParametry(2026);

describe("vypocetInvalidni", () => {
  it("III. stupeň má dvojnásobnou sazbu oproti II. stupni", () => {
    expect(sazbaProStupen(3)).toBeCloseTo(0.015);
    expect(sazbaProStupen(2)).toBeCloseTo(0.0075);
  });

  it("III. stupeň > II. stupeň při stejných vstupech", () => {
    const st2 = vypocetInvalidni(30000, 20, 20, params, 2);
    const st3 = vypocetInvalidni(30000, 20, 20, params, 3);
    expect(st3.duchodCelkem).toBeGreaterThan(st2.duchodCelkem);
  });

  it("připočítává dopočtenou dobu k době pojištění", () => {
    const bez = vypocetInvalidni(30000, 20, 0, params, 3);
    const s = vypocetInvalidni(30000, 20, 20, params, 3);
    // dvojnásobek let → výrazně vyšší procentní výměra
    expect(s.procentniVymera).toBeGreaterThan(bez.procentniVymera);
    expect(s.dopoctenaDobaRoky).toBe(20);
  });

  it("procentní výměra neklesne pod minimum 770 Kč", () => {
    const v = vypocetInvalidni(10000, 0, 0, params, 2);
    expect(v.procentniVymera).toBe(770);
    expect(v.duchodCelkem).toBe(770 + params.zakladniVymera);
  });

  it("důchod = procentní + základní výměra", () => {
    const v = vypocetInvalidni(30000, 25, 10, params, 3);
    expect(v.duchodCelkem).toBe(v.procentniVymera + v.zakladniVymera);
    expect(v.zakladniVymera).toBe(params.zakladniVymera);
  });

  it("ošetří záporné doby (clamp na 0)", () => {
    const v = vypocetInvalidni(30000, -5, -3, params, 3);
    expect(v.dobaPojisteniRoky).toBe(0);
    expect(v.dopoctenaDobaRoky).toBe(0);
    expect(v.procentniVymera).toBe(770);
  });
});
