export type Gender = "male" | "female";

/**
 * Zjednodušená tabulka důchodového věku v ČR (zákon 155/1995 Sb. ve znění
 * od r. 2017). Pro ročníky 1971+ je strop 65 let pro obě pohlaví. Pro starší
 * ročníky postupný náběh; ženy nižší věk dle počtu vychovaných dětí — zde
 * zjednodušeně bereme variantu „bez dětí" (nejvyšší ženský věk).
 *
 * Toto je orientační odhad pro klientskou prezentaci, nikoli závazný výpočet ČSSZ.
 */
const MALE_BY_YEAR: Record<number, number> = {
  1960: 63 + 4 / 12,
  1961: 63 + 6 / 12,
  1962: 63 + 8 / 12,
  1963: 63 + 10 / 12,
  1964: 64,
  1965: 64 + 2 / 12,
  1966: 64 + 4 / 12,
  1967: 64 + 6 / 12,
  1968: 64 + 8 / 12,
  1969: 64 + 10 / 12,
  1970: 65,
};

const FEMALE_BY_YEAR: Record<number, number> = {
  1960: 61 + 8 / 12,
  1961: 62,
  1962: 62 + 4 / 12,
  1963: 62 + 8 / 12,
  1964: 63,
  1965: 63 + 4 / 12,
  1966: 63 + 8 / 12,
  1967: 64,
  1968: 64 + 4 / 12,
  1969: 64 + 8 / 12,
  1970: 65,
};

export function statutoryRetirementAge(birthYear: number, gender: Gender): number {
  if (birthYear >= 1971) return 65;
  const table = gender === "male" ? MALE_BY_YEAR : FEMALE_BY_YEAR;
  return table[birthYear] ?? 65;
}

export function ageAt(birthDate: Date, at: Date = new Date()): number {
  const ms = at.getTime() - birthDate.getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

export function yearsUntilRetirement(
  birthDate: Date,
  gender: Gender,
  plannedAge?: number,
): number {
  const target = plannedAge ?? statutoryRetirementAge(birthDate.getFullYear(), gender);
  const current = ageAt(birthDate);
  return Math.max(0, target - current);
}
