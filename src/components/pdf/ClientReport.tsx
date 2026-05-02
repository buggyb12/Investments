import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCZK, formatPercent, formatYears } from "../../lib/format";
import type { ScenarioResult } from "../../lib/pension";
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
}

const incomeTypeLabels: Record<string, string> = {
  employee: "Zaměstnanec",
  selfEmployed: "OSVČ",
  businessOwner: "Podnikatel",
};

export function ClientReport({ result, inputs }: ClientReportProps) {
  const today = new Date().toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const replacementPct = Math.round(inputs.replacementRate * 100);

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
    </Document>
  );
}
