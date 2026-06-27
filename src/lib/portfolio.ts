/**
 * Investiční portfolio — krok 2 kalkulačky.
 *
 * Curated list 4 ETF, 3 přednastavené profily podle let do důchodu, vzorce
 * pro vážený výnos, TER a SRI. Veškerá data orientační, vychází z veřejných
 * údajů KIID/justETF k roku 2025. Fond data se mění zřídka — držíme staticky.
 */

export type FundId = "aggh" | "vwce" | "cspx" | "sgln";
export type FundCategory = "bonds" | "world" | "us" | "gold";

export interface ETF {
  id: FundId;
  ticker: string;
  isin: string;
  name: string;
  shortName: string;
  category: FundCategory;
  role: string;
  /** Total Expense Ratio, p.a. (0.001 = 0.1 %) */
  ter: number;
  /** Synthetic Risk Indicator 1–7 (KID) */
  sri: number;
  /** Orientační historický roční výnos v EUR za 10 let */
  expectedAnnualReturn: number;
  /** Vstupní poplatek (typicky 0 % u ETF, broker komise zvlášť) */
  entryFee: number;
  /** Výstupní poplatek */
  exitFee: number;
  description: string;
  /** Odkaz na justETF profil — zdroj pro KID/SRI/TER/výnos */
  url: string;
}

export const FUNDS: Record<FundId, ETF> = {
  aggh: {
    id: "aggh",
    ticker: "AGGH",
    isin: "IE00BDBRDM35",
    name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged",
    shortName: "iShares Global Bond",
    category: "bonds",
    role: "Stabilita",
    ter: 0.001,
    sri: 2,
    expectedAnnualReturn: 0.015,
    entryFee: 0,
    exitFee: 0,
    description:
      "Globální dluhopisové portfolio s měnovým hedge do EUR. Tlumí výkyvy akciové části.",
    url: "https://www.justetf.com/en/etf-profile.html?isin=IE00BDBRDM35",
  },
  vwce: {
    id: "vwce",
    ticker: "VWCE",
    isin: "IE00BK5BQT80",
    name: "Vanguard FTSE All-World UCITS ETF (USD) Accumulating",
    shortName: "Vanguard All-World",
    category: "world",
    role: "Globální růst",
    ter: 0.0022,
    sri: 4,
    expectedAnnualReturn: 0.075,
    entryFee: 0,
    exitFee: 0,
    description:
      "~3700 firem z developed i emerging trhů. Jeden fond pokryje globální akcie.",
    url: "https://www.justetf.com/en/etf-profile.html?isin=IE00BK5BQT80",
  },
  cspx: {
    id: "cspx",
    ticker: "CSPX",
    isin: "IE00B5BMR087",
    name: "iShares Core S&P 500 UCITS ETF (Acc)",
    shortName: "iShares S&P 500",
    category: "us",
    role: "US růstový tah",
    ter: 0.0007,
    sri: 4,
    expectedAnnualReturn: 0.1,
    entryFee: 0,
    exitFee: 0,
    description:
      "500 největších firem v USA. Historicky nejvýkonnější segment posledních 15 let.",
    url: "https://www.justetf.com/en/etf-profile.html?isin=IE00B5BMR087",
  },
  sgln: {
    id: "sgln",
    ticker: "SGLN",
    isin: "IE00B4ND3602",
    name: "iShares Physical Gold ETC",
    shortName: "iShares Physical Gold",
    category: "gold",
    role: "Inflační hedge",
    ter: 0.0012,
    sri: 4,
    expectedAnnualReturn: 0.055,
    entryFee: 0,
    exitFee: 0,
    description:
      "Fyzické zlato uložené v trezoru. Ochrana proti inflaci a měnovému riziku.",
    url: "https://www.justetf.com/en/etf-profile.html?isin=IE00B4ND3602",
  },
};

export const FUND_ORDER: FundId[] = ["aggh", "vwce", "cspx", "sgln"];

export type Allocation = Record<FundId, number>;

export type ProfileId = "conservative" | "balanced" | "growth";

export interface PortfolioProfile {
  id: ProfileId;
  name: string;
  description: string;
  yearsRange: [number, number];
  allocation: Allocation;
}

export const PROFILES: Record<ProfileId, PortfolioProfile> = {
  conservative: {
    id: "conservative",
    name: "Konzervativní",
    description: "Pro klienty blízko důchodu — chrání kapitál před výkyvy.",
    yearsRange: [0, 10],
    allocation: { aggh: 0.6, vwce: 0.2, cspx: 0.1, sgln: 0.1 },
  },
  balanced: {
    id: "balanced",
    name: "Vyvážený",
    description: "Střední horizont — kombinace stability a růstu.",
    yearsRange: [10, 20],
    allocation: { aggh: 0.3, vwce: 0.3, cspx: 0.3, sgln: 0.1 },
  },
  growth: {
    id: "growth",
    name: "Růstový",
    description: "Dlouhý horizont — maximalizuje výnos akcií, snese výkyvy.",
    yearsRange: [20, 100],
    allocation: { aggh: 0.1, vwce: 0.4, cspx: 0.4, sgln: 0.1 },
  },
};

export const PROFILE_ORDER: ProfileId[] = ["conservative", "balanced", "growth"];

/**
 * Vybere profil, jehož očekávaný výnos je nejblíž požadovanému,
 * s preferencí konzervativnějšího při shodě (bezpečnější default).
 */
export function pickProfileByYield(targetYield: number): ProfileId {
  let best: ProfileId = "balanced";
  let bestDelta = Infinity;
  for (const id of PROFILE_ORDER) {
    const ret = portfolioMetrics(PROFILES[id].allocation).expectedReturn;
    const delta = Math.abs(ret - targetYield);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = id;
    }
  }
  return best;
}

/** Vybere profil podle let do důchodu (alternativa k yield-matchingu). */
export function pickProfileByYears(years: number): ProfileId {
  if (years < 10) return "conservative";
  if (years < 20) return "balanced";
  return "growth";
}

export interface PortfolioMetrics {
  weightedTER: number;
  expectedReturn: number;
  weightedSRI: number;
}

export function portfolioMetrics(allocation: Allocation): PortfolioMetrics {
  let ter = 0;
  let ret = 0;
  let sri = 0;
  for (const id of FUND_ORDER) {
    const w = allocation[id] ?? 0;
    ter += w * FUNDS[id].ter;
    ret += w * FUNDS[id].expectedAnnualReturn;
    sri += w * FUNDS[id].sri;
  }
  return { weightedTER: ter, expectedReturn: ret, weightedSRI: sri };
}

/**
 * Když uživatel posune slider jednoho fondu na newValue (0..1), ostatní
 * fondy se proporcionálně přepočítají tak, aby součet byl stále 1.
 *
 * Edge cases:
 *  - newValue >= 1 → daný fond na 1, ostatní na 0
 *  - ostatní mají sum 0 → rozdělíme zbytek rovnoměrně
 */
export function adjustAllocation(
  current: Allocation,
  fundId: FundId,
  newValue: number,
): Allocation {
  const clamped = Math.max(0, Math.min(1, newValue));
  if (clamped >= 1) {
    return FUND_ORDER.reduce((acc, id) => {
      acc[id] = id === fundId ? 1 : 0;
      return acc;
    }, {} as Allocation);
  }

  const otherIds = FUND_ORDER.filter((id) => id !== fundId);
  const otherSum = otherIds.reduce((s, id) => s + (current[id] ?? 0), 0);
  const remaining = 1 - clamped;

  const next: Allocation = { ...current, [fundId]: clamped };

  if (otherSum > 0) {
    for (const id of otherIds) {
      next[id] = ((current[id] ?? 0) / otherSum) * remaining;
    }
  } else {
    const equal = remaining / otherIds.length;
    for (const id of otherIds) next[id] = equal;
  }

  // Normalize to defend against floating point drift
  const total = FUND_ORDER.reduce((s, id) => s + next[id], 0);
  if (total > 0 && Math.abs(total - 1) > 1e-9) {
    for (const id of FUND_ORDER) next[id] /= total;
  }

  return next;
}

/** Rozpočet měsíční úložky na konkrétní fondy podle alokace. */
export function splitMonthlyContribution(
  monthlyTotal: number,
  allocation: Allocation,
): Record<FundId, number> {
  const out = {} as Record<FundId, number>;
  for (const id of FUND_ORDER) out[id] = monthlyTotal * (allocation[id] ?? 0);
  return out;
}

/**
 * Třídy aktiv pro klientskou vizualizaci složení portfolia (koláčový graf).
 * Členění odpovídá tomu, na co je klient zvyklý (Conseq apod.).
 */
export type AssetClass =
  | "akcie"
  | "dluhopisy"
  | "nemovitosti"
  | "penezni"
  | "alternativy"
  | "ostatni";

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  akcie: "Akcie",
  dluhopisy: "Dluhopisy",
  nemovitosti: "Nemovitosti",
  penezni: "Peněžní trh / hotovost",
  alternativy: "Alternativní investice",
  ostatni: "Ostatní",
};

export const ASSET_CLASS_ORDER: AssetClass[] = [
  "akcie",
  "dluhopisy",
  "nemovitosti",
  "alternativy",
  "penezni",
  "ostatni",
];

/**
 * Mapování kategorie fondu na třídu aktiv. Až dorazí konkrétní fondy s reálným
 * složením (akcie/dluhopisy/nemovitosti/…), nahradí se tato 1:1 mapa rozpadem
 * jednotlivých fondů podle KID a koláč se přepočítá dle vybrané strategie.
 */
const FUND_ASSET_CLASS: Record<FundCategory, AssetClass> = {
  world: "akcie",
  us: "akcie",
  bonds: "dluhopisy",
  gold: "alternativy",
};

/** Agreguje alokaci fondů na třídy aktiv (jen nenulové), seřazené dle ASSET_CLASS_ORDER. */
export function assetClassBreakdown(
  allocation: Allocation,
): { assetClass: AssetClass; weight: number }[] {
  const sums = {} as Record<AssetClass, number>;
  for (const id of FUND_ORDER) {
    const cls = FUND_ASSET_CLASS[FUNDS[id].category];
    sums[cls] = (sums[cls] ?? 0) + (allocation[id] ?? 0);
  }
  return ASSET_CLASS_ORDER.filter((c) => (sums[c] ?? 0) > 0.0001).map((c) => ({
    assetClass: c,
    weight: sums[c],
  }));
}
