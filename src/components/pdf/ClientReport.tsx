import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCZK, formatPercent, formatYears } from "../../lib/format";
import type { ScenarioResult } from "../../lib/pension";
import {
  FUNDS,
  FUND_ORDER,
  splitMonthlyContribution,
  type Allocation,
  type PortfolioMetrics,
} from "../../lib/portfolio";
import type { ClientInputs } from "../../state/useClientInputs";

// Register fonts that include Czech diacritics
Font.register({
  family: "Fraunces",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAevr1ozeIrnCxvR-Cg.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/fraunces/v32/6NUh8FyLNQOQZAnv9ZwNjucMHVn85Ni7emAevr1ozeIrnCxvBeGg.ttf",
      fontWeight: 600,
    },
  ],
});

Font.register({
  family: "InterTight",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/intertight/v7/NGSnv5HMAFg6IuGlBNMjxLwJKfkpC02uHZ4LQ-A.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/intertight/v7/NGSnv5HMAFg6IuGlBNMjxL4LKfkpC02uHZ4LQ-A.ttf",
      fontWeight: 600,
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 56,
    backgroundColor: "#F4F1EA",
    color: "#1A1815",
    fontFamily: "InterTight",
    fontSize: 10,
    lineHeight: 1.55,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,24,21,0.18)",
    marginBottom: 28,
  },
  brand: {
    fontFamily: "Fraunces",
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: -0.4,
  },
  meta: {
    fontSize: 8,
    color: "#8B857A",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "right",
  },
  clientLine: {
    fontFamily: "Fraunces",
    fontSize: 28,
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  subline: {
    fontSize: 10,
    color: "#8B857A",
    marginBottom: 30,
  },
  section: {
    marginBottom: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,24,21,0.18)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  step: {
    fontSize: 8,
    color: "#8B857A",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: "Fraunces",
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: -0.2,
  },
  bigNumber: {
    fontFamily: "Fraunces",
    fontSize: 32,
    fontWeight: 600,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  bigNumberAccent: {
    color: "#9C3D2E",
  },
  bigNumberSecondary: {
    color: "#3C5A3E",
  },
  body: {
    fontSize: 10,
    color: "#1A1815",
    maxWidth: 460,
  },
  bodyMuted: {
    fontSize: 9,
    color: "#8B857A",
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 32,
  },
  col: { flex: 1 },
  inputsBox: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,24,21,0.18)",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  inputCell: {
    width: "30%",
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 7,
    color: "#8B857A",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  inputValue: {
    fontSize: 10,
    color: "#1A1815",
  },
  // Page 2 — allocation
  allocBar: {
    flexDirection: "row",
    height: 8,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(26,24,21,0.18)",
  },
  fundRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,24,21,0.10)",
    gap: 10,
  },
  fundSwatch: { width: 10, height: 10, marginRight: 4 },
  fundColTicker: { width: 50, fontSize: 9, fontWeight: 600 },
  fundColName: { flex: 1, fontSize: 9 },
  fundColMini: { width: 42, fontSize: 9, textAlign: "right" },
  fundColAlloc: {
    width: 60,
    fontFamily: "Fraunces",
    fontSize: 13,
    fontWeight: 600,
    textAlign: "right",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,24,21,0.18)",
  },
  metricCell: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,24,21,0.18)",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#8B857A",
    letterSpacing: 0.8,
  },
});

interface ClientReportProps {
  result: ScenarioResult;
  inputs: ClientInputs;
  allocation: Allocation;
  portfolioMetrics: PortfolioMetrics;
}

const incomeTypeLabels: Record<string, string> = {
  employee: "Zaměstnanec",
  selfEmployed: "OSVČ",
  businessOwner: "Podnikatel",
};

const FUND_COLORS: Record<string, string> = {
  aggh: "#3C5A3E",
  vwce: "#1A1815",
  cspx: "#9C3D2E",
  sgln: "#B68A35",
};

export function ClientReport({
  result,
  inputs,
  allocation,
  portfolioMetrics,
}: ClientReportProps) {
  const today = new Date().toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const replacementPct = Math.round(inputs.replacementRate * 100);
  const split = splitMonthlyContribution(result.monthlyContribution, allocation);

  return (
    <Document
      title="Důchodový report"
      author="Důchodová kalkulačka"
      subject={`Klient ${inputs.clientName || "—"}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Důchodový report</Text>
          <Text style={styles.meta}>{today}</Text>
        </View>

        <Text style={styles.clientLine}>
          {inputs.clientName ? `Pro ${inputs.clientName}` : "Důchodová projekce"}
        </Text>
        <Text style={styles.subline}>
          Do důchodu zbývá {formatYears(result.yearsToRetirement)} • orientační odhad
        </Text>

        {/* 1. Realita */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.step}>01</Text>
            <Text style={styles.sectionTitle}>Realita</Text>
          </View>
          <Text style={styles.bigNumber}>
            {formatCZK(result.statePension.monthly)} <Text style={styles.bodyMuted}>/ měsíc</Text>
          </Text>
          <Text style={styles.body}>
            Na základě vašich aktuálních příjmů vychází státní starobní důchod
            přibližně na {formatCZK(result.statePension.monthly)} měsíčně.
            Z toho základní výměra {formatCZK(result.statePension.basicComponent)} a
            procentní výměra {formatCZK(result.statePension.percentageComponent)}.
          </Text>
        </View>

        {/* 2. Očekávání */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.step}>02</Text>
            <Text style={styles.sectionTitle}>Očekávání</Text>
          </View>
          <Text style={styles.bigNumber}>
            {formatCZK(result.targetIncome)} <Text style={styles.bodyMuted}>/ měsíc</Text>
          </Text>
          <Text style={styles.body}>
            Pro zachování životní úrovně by bylo ideální mít přibližně{" "}
            {formatCZK(result.targetIncome)} měsíčně, tedy {replacementPct} %
            současného příjmu.
          </Text>
        </View>

        {/* 3. Rozdíl */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.step}>03</Text>
            <Text style={styles.sectionTitle}>Rozdíl</Text>
          </View>
          <Text style={[styles.bigNumber, styles.bigNumberAccent]}>
            {formatCZK(result.monthlyGap)} <Text style={styles.bodyMuted}>/ měsíc</Text>
          </Text>
          <Text style={styles.body}>
            Vzniká rozdíl přibližně {formatCZK(result.monthlyGap)} měsíčně, který
            je třeba pokrýt z vlastních zdrojů — vlastní investice, renta nebo
            jiný kapitál.
          </Text>
        </View>

        {/* 4. Řešení */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.step}>04</Text>
            <Text style={styles.sectionTitle}>Řešení</Text>
          </View>
          <Text style={[styles.bigNumber, styles.bigNumberSecondary]}>
            {formatCZK(result.monthlyContribution)} <Text style={styles.bodyMuted}>/ měsíc</Text>
          </Text>
          <Text style={styles.body}>
            Aby byl tento rozdíl pokryt po dobu {formatYears(inputs.withdrawalYears)},
            je potřeba vytvořit kapitál přibližně{" "}
            {formatCZK(result.requiredCapital)}. To odpovídá pravidelnému
            odkládání asi {formatCZK(result.monthlyContribution)} měsíčně po
            následujících {formatYears(result.yearsToRetirement)} (předpoklad
            výnosu {formatPercent(inputs.accumulationYield)} p.a. v akumulaci a{" "}
            {formatPercent(inputs.withdrawalYield)} p.a. během čerpání).
          </Text>
        </View>

        {/* Vstupy */}
        <View style={styles.inputsBox}>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Datum narození</Text>
            <Text style={styles.inputValue}>
              {new Date(inputs.birthDate).toLocaleDateString("cs-CZ")}
            </Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Typ příjmu</Text>
            <Text style={styles.inputValue}>
              {incomeTypeLabels[inputs.incomeType]}
            </Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Hrubý příjem</Text>
            <Text style={styles.inputValue}>{formatCZK(inputs.grossMonthly)}</Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Odpracované roky</Text>
            <Text style={styles.inputValue}>{inputs.yearsInsured}</Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Plánovaný odchod</Text>
            <Text style={styles.inputValue}>
              {inputs.plannedRetirementAge} let
            </Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Již naspořeno</Text>
            <Text style={styles.inputValue}>
              {formatCZK(inputs.currentSavings)}
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>
            Orientační odhad, není závazný výpočet ČSSZ.
          </Text>
          <Text>{today}</Text>
        </View>
      </Page>

      {/* Page 2 — Investiční portfolio */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Investiční portfolio</Text>
          <Text style={styles.meta}>{today}</Text>
        </View>

        <Text style={styles.clientLine}>Krok 02 — Jak investovat</Text>
        <Text style={styles.subline}>
          Měsíční úložka {formatCZK(result.monthlyContribution)} rozdělená do 4
          fondů. Vážený očekávaný výnos {formatPercent(portfolioMetrics.expectedReturn, 1)},
          vážený TER {formatPercent(portfolioMetrics.weightedTER, 2)}.
        </Text>

        {/* Stacked allocation bar */}
        <View style={styles.allocBar}>
          {FUND_ORDER.map((id) => {
            const w = (allocation[id] ?? 0) * 100;
            if (w <= 0) return null;
            return (
              <View
                key={id}
                style={{
                  width: `${w}%`,
                  backgroundColor: FUND_COLORS[id],
                }}
              />
            );
          })}
        </View>

        {/* Fund table */}
        <View style={{ marginTop: 8 }}>
          <View
            style={{
              flexDirection: "row",
              paddingBottom: 6,
              borderBottomWidth: 1,
              borderBottomColor: "rgba(26,24,21,0.18)",
              gap: 10,
            }}
          >
            <View style={{ width: 14 }} />
            <Text style={[styles.fundColTicker, { color: "#8B857A", fontSize: 7, letterSpacing: 1 }]}>
              TICKER
            </Text>
            <Text style={[styles.fundColName, { color: "#8B857A", fontSize: 7, letterSpacing: 1 }]}>
              FOND / ROLE
            </Text>
            <Text style={[styles.fundColMini, { color: "#8B857A", fontSize: 7, letterSpacing: 1 }]}>
              TER
            </Text>
            <Text style={[styles.fundColMini, { color: "#8B857A", fontSize: 7, letterSpacing: 1 }]}>
              SRI
            </Text>
            <Text style={[styles.fundColMini, { color: "#8B857A", fontSize: 7, letterSpacing: 1 }]}>
              VÝNOS
            </Text>
            <Text style={[styles.fundColAlloc, { color: "#8B857A", fontSize: 7, letterSpacing: 1, fontFamily: "InterTight", fontWeight: 400 }]}>
              PODÍL
            </Text>
          </View>

          {FUND_ORDER.map((id) => {
            const f = FUNDS[id];
            const w = (allocation[id] ?? 0) * 100;
            return (
              <View key={id} style={styles.fundRow}>
                <View
                  style={[styles.fundSwatch, { backgroundColor: FUND_COLORS[id] }]}
                />
                <Link src={f.url} style={[styles.fundColTicker, { color: "#1A1815" }]}>
                  {f.ticker}
                </Link>
                <View style={styles.fundColName}>
                  <Link src={f.url} style={{ color: "#1A1815", textDecoration: "none" }}>
                    {f.shortName}
                  </Link>
                  <Text style={{ fontSize: 7, color: "#8B857A", marginTop: 1 }}>
                    {f.role} · ISIN {f.isin}
                  </Text>
                </View>
                <Text style={styles.fundColMini}>{formatPercent(f.ter, 2)}</Text>
                <Text style={styles.fundColMini}>{f.sri}/7</Text>
                <Text style={styles.fundColMini}>
                  {formatPercent(f.expectedAnnualReturn, 1)}
                </Text>
                <Text style={styles.fundColAlloc}>{Math.round(w)} %</Text>
              </View>
            );
          })}
        </View>

        {/* Monthly split */}
        <Text style={[styles.sectionTitle, { marginTop: 22 }]}>
          Měsíční úložka po fondech
        </Text>
        <View style={{ marginTop: 8 }}>
          {FUND_ORDER.map((id) => {
            if ((allocation[id] ?? 0) <= 0) return null;
            const f = FUNDS[id];
            return (
              <View
                key={id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(26,24,21,0.08)",
                }}
              >
                <Text style={{ fontSize: 9 }}>{f.shortName}</Text>
                <Text style={{ fontSize: 9 }}>{formatCZK(split[id])} / měs</Text>
              </View>
            );
          })}
        </View>

        {/* Summary metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCell}>
            <Text style={styles.inputLabel}>Vážený výnos</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {formatPercent(portfolioMetrics.expectedReturn, 1)}
            </Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.inputLabel}>Vážený TER</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {formatPercent(portfolioMetrics.weightedTER, 2)}
            </Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.inputLabel}>Vážené SRI</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {portfolioMetrics.weightedSRI.toFixed(1)} / 7
            </Text>
          </View>
          <View style={styles.metricCell}>
            <Text style={styles.inputLabel}>Roční TER náklady</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {formatCZK(
                result.monthlyContribution * 12 * portfolioMetrics.weightedTER,
              )}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 8,
            color: "#8B857A",
            marginTop: 18,
            lineHeight: 1.5,
          }}
        >
          Zdroj dat (TER, SRI, KID, historický výnos):{" "}
          <Link src="https://www.justetf.com" style={{ color: "#8B857A" }}>
            justETF.com
          </Link>
          . Tickery a ISIN jsou klikatelné — odkazují na profil fondu. Vstupní
          poplatek 0 % platí pro samotný ETF. Skutečné náklady na nákup závisí
          na vybraném brokerovi (XTB, Fio, Patria, Interactive Brokers,
          Trading 212…) — typicky komise 0,1–0,5 % za obchod nebo paušál.
          Historické výnosy nejsou zárukou budoucích. Existuje měnové riziko
          (CZK vs. USD/EUR). Pro osvobození od daně platí 3letý časový test.
          Toto není investiční poradenství dle § 4 ZPKT.
        </Text>

        <View style={styles.footer} fixed>
          <Text>Investiční portfolio — orientační doporučení.</Text>
          <Text>{today}</Text>
        </View>
      </Page>
    </Document>
  );
}
