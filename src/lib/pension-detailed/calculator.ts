/**
 * Výpočet starobního důchodu dle zákona č. 155/1995 Sb.
 *
 * Port `pension_calc.py` z buggyb12/duchodovaKalkulacka.
 *
 * Postup:
 * 1. Roční vyměřovací základ × koeficient nárůstu = přepočtený VZ
 * 2. Suma přepočtených VZ za roky 1986..(rok přiznání - 1) = úhrn ročních VZ
 * 3. OVZ = úhrn × 30,4167 / (kal. dny - vyloučené dny)
 * 4. Výpočtový základ = redukce OVZ podle redukčních hranic
 * 5. Procentní výměra = výpočtový základ × roky × procento ± úprava
 * 6. Důchod = procentní výměra + základní výměra
 */

import {
  getKoeficienty,
  getParametry,
  duchodovyVek,
  type Gender,
  type RokParametry,
  type Varianta,
} from "./parameters";

export interface VstupRok {
  rok: number;
  vymerovaciZaklad: number;
  vylouceneDny?: number;
}

export interface Vstup {
  datumNarozeni: Date;
  pohlavi: Gender;
  pocetDeti: number;
  datumPriznani: Date;
  rokyPojisteni: number;
  dnyPresluhovani?: number;
  rokyDat: VstupRok[];
  varianta?: Varianta;
}

export interface RocniDetail {
  rok: number;
  vz: number;
  koef: number;
  prepoctene: number;
  vylouceneDny: number;
}

export interface Vysledek {
  osobniVymerovaciZaklad: number;
  vypoctovyZaklad: number;
  procentniVymera: number;
  zakladniVymera: number;
  duchodCelkem: number;
  duchodovyVekRoky: number;
  duchodovyVekMesice: number;
  procentoZaPojisteni: number;
  jePredcasny: boolean;
  dnyPredcasnosti: number;
  slevaZaPredcasnostPct: number;
  bonusZaPresluhovaniPct: number;
  podrobnosti: {
    uhrnRocnichVz: number;
    pocetKalDnu: number;
    pocetVyloucenychDnu: number;
    redukce1: number;
    redukce2: number;
    zapocetDo1Pct: number;
    zapocet1To2Pct: number;
    procentoZaRokPct: number;
    minDuchod: number;
    datumDosazeniDv: string;
    rocniDetaily: RocniDetail[];
  };
}

function isLeap(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInYear(year: number): number {
  return isLeap(year) ? 366 : 365;
}

/**
 * Redukce osobního vyměřovacího základu podle redukčních hranic.
 */
export function redukujOvz(ovz: number, params: RokParametry): number {
  const { redukce1: rh1, redukce2: rh2, zapocetDo1: z1, zapocet1To2: z12 } = params;
  if (ovz <= rh1) return ovz * z1;
  if (ovz <= rh2) return rh1 * z1 + (ovz - rh1) * z12;
  return rh1 * z1 + (rh2 - rh1) * z12; // nad RH2 se nepřihlíží
}

/**
 * Maximální roční VZ pro daný rok (od 2008 platí omezení).
 * Zjednodušení: necháváme bez omezení (Python verze také zjednodušuje).
 */
function maxRocniVz(_rok: number): number {
  return Number.POSITIVE_INFINITY;
}

/**
 * Hlavní výpočet starobního důchodu.
 *
 * Vrací orientační odhad — produkční použití vyžaduje validaci proti rozhodnutí ČSSZ.
 */
export function vypocet(vstup: Vstup): Vysledek {
  const varianta = vstup.varianta ?? "zakladni";
  const dnyPresluhovani = vstup.dnyPresluhovani ?? 0;

  const rokP = vstup.datumPriznani.getFullYear();
  const params = getParametry(rokP, varianta);
  const koeficienty = getKoeficienty(rokP, varianta);

  // 1. Přepočet ročních VZ a součet
  let uhrnRocnichVz = 0;
  let pocetKalDnu = 0;
  let pocetVyloucenych = 0;
  const rocniDetaily: RocniDetail[] = [];

  const rokZacatek = 1986;
  const rokKonec = rokP - 1;

  for (let r = rokZacatek; r <= rokKonec; r++) {
    const koef = koeficienty[r] ?? 1.0;
    const rocniData = vstup.rokyDat.find((rd) => rd.rok === r);
    const vz = rocniData?.vymerovaciZaklad ?? 0;
    const vyl = rocniData?.vylouceneDny ?? 0;
    const vzOmezeny = Math.min(vz, maxRocniVz(r));
    const prepoctene = vzOmezeny * koef;
    uhrnRocnichVz += prepoctene;

    pocetKalDnu += daysInYear(r);
    pocetVyloucenych += vyl;
    rocniDetaily.push({ rok: r, vz, koef, prepoctene, vylouceneDny: vyl });
  }

  // 2. Osobní vyměřovací základ (OVZ)
  const delitel = pocetKalDnu - pocetVyloucenych;
  const ovz = delitel <= 0 ? 0 : (30.4167 * uhrnRocnichVz) / delitel;

  // 3. Výpočtový základ (redukce)
  const vypoctovyZaklad = redukujOvz(ovz, params);

  // 4. Důchodový věk
  const dv = duchodovyVek(
    vstup.datumNarozeni.getFullYear(),
    vstup.datumNarozeni.getMonth() + 1,
    vstup.pohlavi,
    vstup.pocetDeti,
  );

  // Datum dosažení důchodového věku
  const narMesic = vstup.datumNarozeni.getMonth() + 1;
  const totalMonthsAtBirth = vstup.datumNarozeni.getFullYear() * 12 + (narMesic - 1);
  const totalMonthsAtDV = totalMonthsAtBirth + dv.roky * 12 + dv.mesice;
  const dvRok = Math.floor(totalMonthsAtDV / 12);
  const dvMes = (totalMonthsAtDV % 12) + 1;
  const narDen = vstup.datumNarozeni.getDate();
  const datumDv = new Date(dvRok, dvMes - 1, narDen <= 28 ? narDen : 28);

  // 5. Předčasnost / přesluhování
  const jePredcasny = vstup.datumPriznani.getTime() < datumDv.getTime();
  let dnyPredcasnosti = 0;
  let slevaPct = 0;
  let bonusPct = 0;

  if (jePredcasny) {
    dnyPredcasnosti = Math.round(
      (datumDv.getTime() - vstup.datumPriznani.getTime()) / (24 * 60 * 60 * 1000),
    );
    const ctvrtleti = Math.ceil(dnyPredcasnosti / 90);
    // 1.5 % za každých započatých 90 dní (0.75 % při 45+ letech pojištění)
    const sazba = vstup.rokyPojisteni >= 45 ? 0.0075 : 0.015;
    slevaPct = ctvrtleti * sazba;
  } else if (dnyPresluhovani > 0) {
    const ctvrtletiP = Math.floor(dnyPresluhovani / 90);
    bonusPct = ctvrtletiP * 0.015;
  }

  // 6. Procentní výměra
  const procentoZaRok = params.procentoZaRok;
  const pctZaPojisteni = vstup.rokyPojisteni * procentoZaRok;
  const pctCelkem = Math.max(pctZaPojisteni - slevaPct + bonusPct, 0);
  let procentniVymera = vypoctovyZaklad * pctCelkem;

  // Minimální procentní výměra: 770 Kč
  procentniVymera = Math.max(procentniVymera, 770);

  const zakladniVymera = params.zakladniVymera;
  let duchod = procentniVymera + zakladniVymera;

  // Minimální starobní důchod (20 % průměrné mzdy od 2026)
  duchod = Math.max(duchod, params.minDuchod);

  return {
    osobniVymerovaciZaklad: Math.round(ovz * 100) / 100,
    vypoctovyZaklad: Math.round(vypoctovyZaklad * 100) / 100,
    procentniVymera: Math.round(procentniVymera),
    zakladniVymera: Math.round(zakladniVymera),
    duchodCelkem: Math.round(duchod),
    duchodovyVekRoky: dv.roky,
    duchodovyVekMesice: dv.mesice,
    procentoZaPojisteni: Math.round(pctCelkem * 100 * 1000) / 1000,
    jePredcasny,
    dnyPredcasnosti,
    slevaZaPredcasnostPct: Math.round(slevaPct * 100 * 1000) / 1000,
    bonusZaPresluhovaniPct: Math.round(bonusPct * 100 * 1000) / 1000,
    podrobnosti: {
      uhrnRocnichVz: Math.round(uhrnRocnichVz * 100) / 100,
      pocetKalDnu,
      pocetVyloucenychDnu: pocetVyloucenych,
      redukce1: params.redukce1,
      redukce2: params.redukce2,
      zapocetDo1Pct: params.zapocetDo1 * 100,
      zapocet1To2Pct: params.zapocet1To2 * 100,
      procentoZaRokPct: params.procentoZaRok * 100,
      minDuchod: params.minDuchod,
      datumDosazeniDv: datumDv.toISOString().slice(0, 10),
      rocniDetaily,
    },
  };
}

/**
 * Vrátí výsledky pro všechny 4 predikční varianty.
 */
export function vypocetVsechnyVarianty(vstup: Vstup): Record<Varianta, Vysledek> {
  const out = {} as Record<Varianta, Vysledek>;
  for (const v of ["minimalisticka", "zakladni", "stredni", "optimisticka"] as Varianta[]) {
    out[v] = vypocet({ ...vstup, varianta: v });
  }
  return out;
}
