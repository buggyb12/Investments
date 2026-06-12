import { describe, expect, it } from "vitest";
import { birthInfoFromRc } from "./ivk-parser";

describe("birthInfoFromRc", () => {
  it("žena 1975 (Michaela)", () => {
    expect(birthInfoFromRc("7561094475")).toEqual({
      birthDate: "1975-11-09",
      gender: "female",
      birthYear: 1975,
    });
  });

  it("žena 1974 (Evženie)", () => {
    expect(birthInfoFromRc("7457310773")).toEqual({
      birthDate: "1974-07-31",
      gender: "female",
      birthYear: 1974,
    });
  });

  it("muž 1975 (Dostálek)", () => {
    expect(birthInfoFromRc("7505245077")).toEqual({
      birthDate: "1975-05-24",
      gender: "male",
      birthYear: 1975,
    });
  });

  it("10místné RČ s yy<54 → 20xx", () => {
    expect(birthInfoFromRc("0651012345")?.birthYear).toBe(2006);
    expect(birthInfoFromRc("0651012345")?.gender).toBe("female");
  });

  it("9místné RČ → 19xx (před 1954)", () => {
    expect(birthInfoFromRc("505101234")?.birthYear).toBe(1950);
  });

  it("nevalidní vstupy → null", () => {
    expect(birthInfoFromRc("")).toBeNull();
    expect(birthInfoFromRc("12345")).toBeNull();
    expect(birthInfoFromRc("7599094475")).toBeNull(); // měsíc 99-70=29
  });
});
