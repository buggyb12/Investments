/**
 * Golden testy proti reálným datům z ePortálu ČSSZ (Přehled dob důchodového
 * pojištění / IOLDP). Hlídají, že výpočet odpovídá vygenerovaným reportům a
 * že vyloučené doby (péče o dítě, nemoc) správně zvyšují důchod.
 *
 * Data jsou anonymizovaná (jen roky, vyměřovací základy a vyloučené dny).
 */

import { describe, expect, it } from "vitest";
import { vypocet, type VstupRok } from "./calculator";
import { toStatePensionResult } from "./adapter";
import { PREDIKCE_VARIANTY } from "./parameters";

/** Projekce budoucích let: poslední VZ roste tempem zvolené varianty. */
function project(rows: VstupRok[], retYear: number): VstupRok[] {
  const rust = PREDIKCE_VARIANTY.zakladni;
  const last = rows
    .filter((r) => r.vymerovaciZaklad > 0)
    .reduce((a, b) => (b.rok > a.rok ? b : a));
  const known = new Set(rows.map((r) => r.rok));
  const proj: VstupRok[] = [];
  for (let r = Math.max(2026, last.rok + 1); r < retYear; r++) {
    if (known.has(r)) continue;
    proj.push({
      rok: r,
      vymerovaciZaklad: Math.round(
        last.vymerovaciZaklad * Math.pow(1 + rust, r - last.rok),
      ),
      vylouceneDny: 0,
    });
  }
  return [...rows, ...proj];
}

// *24.5.1975, muž, bez dětí — reálné IOLDP (žádné vyloučené doby).
const DOSTALEK: VstupRok[] = [
  [1997, 10000], [1998, 223734], [1999, 333673], [2000, 965185],
  [2001, 1000456], [2002, 963937], [2003, 972397], [2004, 950489],
  [2005, 1010376], [2006, 1046081], [2007, 1304009], [2008, 1374358],
  [2009, 1350913], [2010, 1440099], [2011, 1360038], [2012, 1695851],
  [2013, 1522123], [2014, 1541794], [2015, 1594632], [2016, 1658703],
  [2017, 1672928], [2018, 1537873], [2019, 1375272], [2020, 1440180],
  [2021, 1536028], [2022, 1726885], [2023, 2115538], [2024, 2136112],
  [2025, 2174867],
].map(([rok, vz]) => ({ rok, vymerovaciZaklad: vz }));

// *31.10.1974, žena, 2 děti — reálné IOLDP s vyloučenými dny (nemoc, péče).
const ZABOJOVA: VstupRok[] = [
  [1999, 147282, 7], [2002, 185091, 69], [2005, 112915, 161], [2006, 22971, 176],
  [2008, 0, 155], [2011, 0, 104], [2015, 226441, 37], [2018, 314623, 17],
  [2020, 271595, 74], [2022, 582371, 0], [2023, 825561, 0], [2024, 896498, 0],
  [2025, 917423, 0],
].map(([rok, vz, vyl]) => ({ rok, vymerovaciZaklad: vz, vylouceneDny: vyl }));

describe("reálná IOLDP data", () => {
  it("Dostálek — výpočet odpovídá reportu (nominál 2041 ≈ 78 091 Kč)", () => {
    const v = vypocet({
      datumNarozeni: new Date(1975, 4, 24),
      pohlavi: "M",
      pocetDeti: 0,
      datumPriznani: new Date(2041, 4, 24),
      rokyPojisteni: 43,
      rokyDat: project(DOSTALEK, 2041),
      varianta: "zakladni",
    });
    // Hodnota ~78 091 dosedne jen s rozhodným obdobím od 1994 (1975 + 19);
    // se starým začátkem 1986 by nulové roky 1986–1993 OVZ ředily a důchod
    // by vyšel nižší.
    expect(v.duchodCelkem).toBeGreaterThan(77000);
    expect(v.duchodCelkem).toBeLessThan(79000);
    const sp = toStatePensionResult(v, 2041, 0.03);
    expect(Math.round(sp.monthly)).toBeGreaterThan(49000); // dnešní kupní síla ~50 124
  });

  it("Zábojová — vyloučené doby zvyšují důchod (nižší jmenovatel OVZ)", () => {
    const common = {
      datumNarozeni: new Date(1974, 9, 31),
      pohlavi: "Z" as const,
      pocetDeti: 2,
      datumPriznani: new Date(2041, 9, 31),
      rokyPojisteni: 38,
      varianta: "zakladni" as const,
    };
    const sVyl = vypocet({ ...common, rokyDat: project(ZABOJOVA, 2041) });
    const bezVyl = vypocet({
      ...common,
      rokyDat: project(ZABOJOVA, 2041).map((r) => ({ ...r, vylouceneDny: 0 })),
    });
    expect(sVyl.osobniVymerovaciZaklad).toBeGreaterThan(
      bezVyl.osobniVymerovaciZaklad,
    );
    expect(sVyl.duchodCelkem).toBeGreaterThan(bezVyl.duchodCelkem);
  });
});
