import {
  Circle,
  Document,
  Font,
  Link,
  Page,
  Path,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { formatCZK, formatPercent, formatYears } from "../../lib/format";
import type { ScenarioResult } from "../../lib/pension";
import {
  ASSET_CLASS_LABELS,
  assetClassBreakdown,
  FUNDS,
  FUND_ORDER,
  splitMonthlyContribution,
  type Allocation,
  type AssetClass,
  type PortfolioMetrics,
} from "../../lib/portfolio";
import type { ClientInputs, PensionInsights } from "../../state/useClientInputs";
import { GLOSSARY } from "../../lib/glossary";

// Built-in PDF fonts (Helvetica/Times) use WinAnsi encoding, which
// silently DROPS Czech-specific diacritics (č, ř, ě, š, ž, ů, ť) —
// they fall outside Latin-1. We bundle Roboto + Roboto Slab WOFF
// files (Apache 2.0) in public/fonts and serve them from the same
// origin as the app. No CDN dependency.
Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto-Regular.woff", fontWeight: 400 },
    { src: "/fonts/Roboto-Bold.woff", fontWeight: 700 },
  ],
});

Font.register({
  family: "RobotoSlab",
  fonts: [{ src: "/fonts/Roboto-Slab-Bold.woff", fontWeight: 700 }],
});

const DISPLAY_FONT = "RobotoSlab";
const BODY_FONT = "Roboto";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    backgroundColor: "#FBF1EC",
    color: "#1A1A1A",
    fontFamily: BODY_FONT,
    fontSize: 9.5,
    lineHeight: 1.45,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,26,26,0.18)",
    marginBottom: 18,
  },
  brand: {
    fontFamily: DISPLAY_FONT,
    fontSize: 14,
    fontWeight: 700,
    letterSpacing: -0.4,
    lineHeight: 1.1,
  },
  meta: {
    fontSize: 8,
    color: "#7C7570",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    textAlign: "right",
  },
  clientLine: {
    fontFamily: DISPLAY_FONT,
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.15,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subline: {
    fontSize: 9,
    color: "#7C7570",
    lineHeight: 1.4,
    marginBottom: 18,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  metricCell: {
    width: "50%",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,26,26,0.18)",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  step: {
    fontSize: 7.5,
    color: "#7C7570",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: DISPLAY_FONT,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: -0.1,
    textTransform: "uppercase",
  },
  bigNumberRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 6,
  },
  bigNumber: {
    fontFamily: DISPLAY_FONT,
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: -0.6,
    lineHeight: 1.15,
  },
  bigNumberUnit: {
    fontSize: 8.5,
    color: "#7C7570",
    marginLeft: 4,
  },
  bigNumberAccent: {
    color: "#E94E1B",
  },
  bigNumberSecondary: {
    color: "#1E3A5C",
  },
  body: {
    fontSize: 9,
    color: "#1A1A1A",
    lineHeight: 1.45,
  },
  bodyMuted: {
    fontSize: 9,
    color: "#7C7570",
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 32,
  },
  col: { flex: 1 },
  inputsBox: {
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,26,26,0.18)",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  inputCell: {
    width: "33.33%",
    marginBottom: 8,
    paddingRight: 12,
  },
  inputLabel: {
    fontSize: 7,
    color: "#7C7570",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  inputValue: {
    fontSize: 10,
    color: "#1A1A1A",
  },
  // Page 2 — allocation
  allocBar: {
    flexDirection: "row",
    height: 8,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(26,26,26,0.18)",
  },
  fundRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,26,26,0.10)",
    gap: 10,
  },
  fundSwatch: { width: 10, height: 10, marginRight: 4 },
  fundColTicker: { width: 50, fontSize: 9, fontWeight: 700 },
  fundColName: { flex: 1, fontSize: 9 },
  fundColMini: { width: 42, fontSize: 9, textAlign: "right" },
  fundColAlloc: {
    width: 60,
    fontFamily: DISPLAY_FONT,
    fontSize: 13,
    fontWeight: 700,
    textAlign: "right",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,26,26,0.18)",
  },
  portfolioMetricCell: { flex: 1 },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 56,
    right: 56,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(26,26,26,0.18)",
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#7C7570",
    letterSpacing: 0.8,
  },
});

interface ClientReportProps {
  result: ScenarioResult;
  inputs: ClientInputs;
  allocation: Allocation;
  portfolioMetrics: PortfolioMetrics;
  insights?: PensionInsights;
  /** Měsíční příjem odvozený z IVK (detailní mód). */
  effectiveGross?: number;
}

function formatVek(v: { roky: number; mesice: number }): string {
  return v.mesice ? `${v.roky} let ${v.mesice} měs.` : `${v.roky} let`;
}

const incomeTypeLabels: Record<string, string> = {
  employee: "Zaměstnanec",
  selfEmployed: "OSVČ",
  businessOwner: "Podnikatel",
};

interface MetricCellProps {
  step: string;
  title: string;
  value: string;
  description: string;
  subValue?: string;
  tone?: "default" | "accent" | "secondary";
}

function MetricCell({ step, title, value, description, subValue, tone = "default" }: MetricCellProps) {
  const valueStyle =
    tone === "accent"
      ? [styles.bigNumber, styles.bigNumberAccent]
      : tone === "secondary"
        ? [styles.bigNumber, styles.bigNumberSecondary]
        : [styles.bigNumber];
  return (
    <View style={styles.metricCell}>
      <View style={styles.sectionHeader}>
        <Text style={styles.step}>{step}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.bigNumberRow}>
        <Text style={valueStyle}>{value}</Text>
        <Text style={styles.bigNumberUnit}>/ měsíc</Text>
      </View>
      {subValue && (
        <Text style={{ fontSize: 7.5, color: "#7C7570", marginTop: -3, marginBottom: 4 }}>
          {subValue}
        </Text>
      )}
      <Text style={styles.body}>{description}</Text>
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  note?: string;
}

function DetailRow({ label, value, note }: DetailRowProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(26,26,26,0.10)",
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 8.5 }}>{label}</Text>
        {note && (
          <Text style={{ fontSize: 7, color: "#7C7570", marginTop: 1 }}>
            {note}
          </Text>
        )}
      </View>
      <Text style={{ fontSize: 9.5, fontWeight: 700 }}>{value}</Text>
    </View>
  );
}

const FUND_COLORS: Record<string, string> = {
  aggh: "#1E3A5C",
  vwce: "#1A1A1A",
  cspx: "#E94E1B",
  sgln: "#B68A35",
};

const ASSET_COLORS_PDF: Record<AssetClass, string> = {
  akcie: "#1A1A1A",
  dluhopisy: "#1E3A5C",
  nemovitosti: "#6E7B57",
  alternativy: "#B68A35",
  penezni: "#9A938C",
  ostatni: "#C9C2BB",
};

/**
 * Značka GFS Group v patičce. Zatím čistý wordmark v brand barvě — přesný
 * symbol (logo-mark.svg) se sem doplní, jakmile bude soubor k dispozici.
 */
function GfsLogo() {
  return (
    <Text
      style={{
        fontFamily: DISPLAY_FONT,
        fontWeight: 700,
        fontSize: 10,
        color: "#DB5126",
        letterSpacing: 0.6,
      }}
    >
      GFS
    </Text>
  );
}

/** Patička s logem GFS Group, popiskem a datem — sdílená napříč stranami. */
function Footer({ label, today }: { label: string; today: string }) {
  return (
    <View style={styles.footer} fixed>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <GfsLogo />
        <Text>{label}</Text>
      </View>
      <Text>{today}</Text>
    </View>
  );
}

/** Výseč koláče: cesta od středu po oblouku. */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const a0 = ((startDeg - 90) * Math.PI) / 180;
  const a1 = ((endDeg - 90) * Math.PI) / 180;
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M${cx} ${cy} L${x0} ${y0} A${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
}

/** Koláčový graf složení portfolia podle tříd aktiv (PDF, ručně přes SVG). */
function AssetClassPiePdf({ allocation }: { allocation: Allocation }) {
  const data = assetClassBreakdown(allocation);
  let acc = 0;
  const slices = data.map((d) => {
    const start = acc * 360;
    acc += d.weight;
    return { ...d, start, end: acc * 360 };
  });
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 22,
        marginTop: 8,
        marginBottom: 16,
      }}
    >
      <Svg width={96} height={96} viewBox="0 0 100 100">
        {slices.length === 1 ? (
          <Circle cx={50} cy={50} r={46} fill={ASSET_COLORS_PDF[slices[0].assetClass]} />
        ) : (
          slices.map((s) => (
            <Path
              key={s.assetClass}
              d={arcPath(50, 50, 46, s.start, s.end)}
              fill={ASSET_COLORS_PDF[s.assetClass]}
            />
          ))
        )}
      </Svg>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>
          Složení podle tříd aktiv
        </Text>
        {data.map((d) => (
          <View
            key={d.assetClass}
            style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}
          >
            <View
              style={{
                width: 9,
                height: 9,
                backgroundColor: ASSET_COLORS_PDF[d.assetClass],
                marginRight: 7,
              }}
            />
            <Text style={{ fontSize: 9.5, flex: 1 }}>
              {ASSET_CLASS_LABELS[d.assetClass]}
            </Text>
            <Text style={{ fontSize: 9.5, fontWeight: 700 }}>
              {Math.round(d.weight * 100)} %
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ClientReport({
  result,
  inputs,
  allocation,
  portfolioMetrics,
  insights,
  effectiveGross,
}: ClientReportProps) {
  const today = new Date().toLocaleDateString("cs-CZ", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const replacementPct = Math.round(inputs.replacementRate * 100);
  const split = splitMonthlyContribution(result.monthlyContribution, allocation);

  // Detailní mód: vstupy odvozené z nahraného IVK, ne aproximační defaulty.
  const isDetailed = inputs.mode === "detailed";
  const grossShown =
    isDetailed && effectiveGross && effectiveGross > 0
      ? effectiveGross
      : inputs.grossMonthly;
  const dobaPojisteni = insights?.dobaPojisteni;
  const zakonnyVek = insights?.zakonnyVek;
  const sp = result.statePension;
  const nominalDiff = sp.monthlyNominal - sp.monthly;
  // Nahrané IDA PDF → „Realita" je přímý výpočet ČSSZ, ne naše modelace.
  const csszAuthoritative = insights?.csszOdhad?.odhadDuchodu != null;

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
          {csszAuthoritative
            ? `Do důchodu zbývá ${formatYears(result.yearsToRetirement)} • důchod dle přímého výpočtu ČSSZ (Informativní důchodová aplikace)`
            : `Do důchodu zbývá ${formatYears(result.yearsToRetirement)} • hodnoty v dnešní kupní síle (deflátováno inflací ${formatPercent(inputs.inflation, 1)} p.a.)`}
        </Text>

        {/* Info o osobě — před výpočty */}
        <View style={styles.inputsBox}>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Datum narození</Text>
            <Text style={styles.inputValue}>
              {new Date(inputs.birthDate).toLocaleDateString("cs-CZ")}
            </Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>
              {isDetailed ? "Hrubý příjem (z IVK)" : "Hrubý příjem"}
            </Text>
            <Text style={styles.inputValue}>{formatCZK(grossShown)}</Text>
          </View>
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>
              {isDetailed && dobaPojisteni
                ? "Doba pojištění (vč. projekce)"
                : "Odpracované roky"}
            </Text>
            <Text style={styles.inputValue}>
              {isDetailed && dobaPojisteni
                ? `${dobaPojisteni.celkemRoky} let (${dobaPojisteni.evidovanaRoky} evidováno + ${dobaPojisteni.projekceRoky} do odchodu)`
                : inputs.yearsInsured}
            </Text>
          </View>
          {!isDetailed && (
            <View style={styles.inputCell}>
              <Text style={styles.inputLabel}>Typ příjmu</Text>
              <Text style={styles.inputValue}>
                {incomeTypeLabels[inputs.incomeType]}
              </Text>
            </View>
          )}
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Plánovaný odchod</Text>
            <Text style={styles.inputValue}>
              {inputs.plannedRetirementAge} let
            </Text>
          </View>
          {zakonnyVek && (
            <View style={styles.inputCell}>
              <Text style={styles.inputLabel}>Zákonný důchodový věk</Text>
              <Text style={styles.inputValue}>{formatVek(zakonnyVek)}</Text>
            </View>
          )}
          <View style={styles.inputCell}>
            <Text style={styles.inputLabel}>Již naspořeno</Text>
            <Text style={styles.inputValue}>
              {formatCZK(inputs.currentSavings)}
            </Text>
          </View>
        </View>

        {/* 2x2 grid of metrics */}
        <View style={styles.metricsGrid}>
          <MetricCell
            step="01"
            title="Realita"
            value={formatCZK(result.statePension.monthly)}
            subValue={
              result.statePension.rokPriznani > new Date().getFullYear() &&
              Math.abs(result.statePension.monthlyNominal - result.statePension.monthly) > 1
                ? `nominálně v r. ${result.statePension.rokPriznani}: ${formatCZK(result.statePension.monthlyNominal)}`
                : undefined
            }
            description={
              csszAuthoritative
                ? `Přímý výpočet ČSSZ (IDA) — bereme jako důchod v době odchodu. Základní výměra ${formatCZK(result.statePension.basicComponent)}, procentní výměra ${formatCZK(result.statePension.percentageComponent)}.`
                : `V dnešní kupní síle. Základní výměra ${formatCZK(result.statePension.basicComponent)}, procentní výměra ${formatCZK(result.statePension.percentageComponent)}.`
            }
          />
          <MetricCell
            step="02"
            title="Očekávání"
            value={formatCZK(result.targetIncome)}
            description={`Pro zachování životní úrovně by bylo ideální mít ${formatCZK(result.targetIncome)} měsíčně, tedy ${replacementPct} % současného příjmu.`}
          />
          <MetricCell
            step="03"
            title="Rozdíl"
            value={formatCZK(result.monthlyGap)}
            tone="accent"
            description={`Rozdíl ${formatCZK(result.monthlyGap)} měsíčně je třeba pokrýt z vlastních zdrojů — vlastní investice, renta nebo jiný kapitál.`}
          />
          <MetricCell
            step="04"
            title="Řešení"
            value={formatCZK(result.monthlyContribution)}
            tone="secondary"
            description={`Pro pokrytí po dobu ${formatYears(inputs.withdrawalYears)} je potřeba kapitál ${formatCZK(result.requiredCapital)}. Odpovídá ukládání ${formatCZK(result.monthlyContribution)} měsíčně po ${formatYears(result.yearsToRetirement)} při výnosu ${formatPercent(inputs.accumulationYield, 0)} p.a.`}
          />
        </View>

        {/* Doplňující výstupy: nominál/reál, doplnění dob, invalidita */}
        {(insights || nominalDiff > 1) && (
          <View style={{ marginTop: 14 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 6 }]}>
              Doplňující přehled
            </Text>

            {nominalDiff > 1 && (
              <DetailRow
                label={`Důchod nominálně v r. ${sp.rokPriznani} / v dnešní kupní síle`}
                value={`${formatCZK(sp.monthlyNominal)} / ${formatCZK(sp.monthly)}`}
                note={`rozdíl vlivem inflace ${formatPercent(inputs.inflation, 1)} p.a.: ${formatCZK(nominalDiff)}`}
              />
            )}

            {zakonnyVek && (
              <DetailRow
                label="Zvolený věk odchodu vs. zákonný nárok"
                value={`${inputs.plannedRetirementAge} let vs. ${formatVek(zakonnyVek)}`}
                note={
                  inputs.plannedRetirementAge <
                  zakonnyVek.roky + zakonnyVek.mesice / 12
                    ? "Zvolený odchod je před vznikem nároku na řádný starobní důchod (předčasný důchod = trvalé krácení)."
                    : undefined
                }
              />
            )}

            {insights?.doplneniDob && (
              <DetailRow
                label={`Důchod po doplnění ${insights.doplneniDob.pocetDoplnenych} chybějících let pojištění`}
                value={`${formatCZK(insights.doplneniDob.aktualni.monthly)} → ${formatCZK(insights.doplneniDob.poDoplneni.monthly)}`}
                note={`rozdíl ${formatCZK(insights.doplneniDob.rozdil)} měsíčně (doplněno průměrem známých let, v dnešní kupní síle)`}
              />
            )}

            {insights?.invalidni && (
              <DetailRow
                label="Orientační invalidní důchod (vznik invalidity nyní)"
                value={`I. ${formatCZK(insights.invalidni.st1.duchodCelkem)} · II. ${formatCZK(insights.invalidni.st2.duchodCelkem)} · III. ${formatCZK(insights.invalidni.st3.duchodCelkem)}`}
                note="Stupně dle poklesu prac. schopnosti (I. 35–49 %, II. 50–69 %, III. 70 %+); nárok podmiňuje i potřebná doba pojištění dle věku. Podklad pro pojištění invalidity."
              />
            )}

            {insights?.odvody && (
              <DetailRow
                label="Vliv výše odvodů (OSVČ / s.r.o.): minimální vs. současné"
                value={`${formatCZK(insights.odvody.minimalni.monthly)} → ${formatCZK(insights.odvody.soucasne.monthly)}`}
                note={`vyšší odvody zvednou důchod o ${formatCZK(insights.odvody.rozdil)} měsíčně. Minimální vyměřovací základ orientačně ${formatCZK(insights.odvody.minMesic)} / měs.`}
              />
            )}

            {insights?.csszOdhad?.odhadDuchodu != null && (
              <DetailRow
                label="Oficiální výpočet ČSSZ (Informativní důchodová aplikace)"
                value={`${formatCZK(insights.csszOdhad.odhadDuchodu)} / měs`}
                note={`Použito jako hlavní hodnota „Realita" — důchod v době odchodu${
                  insights.csszOdhad.ovz != null
                    ? `; OVZ ${formatCZK(insights.csszOdhad.ovz)}`
                    : ""
                }${
                  insights.csszOdhad.datumDuchodovehoVeku
                    ? `; důchodový věk ${new Date(insights.csszOdhad.datumDuchodovehoVeku).toLocaleDateString("cs-CZ")}`
                    : ""
                }.`}
              />
            )}
          </View>
        )}

        <Footer
          label={
            csszAuthoritative
              ? "Důchod dle informativního výpočtu ČSSZ (IDA); ostatní hodnoty orientační."
              : "Orientační odhad, není závazný výpočet ČSSZ."
          }
          today={today}
        />
      </Page>

      {/* Page 2 — Investiční portfolio */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Investiční portfolio</Text>
          <Text style={styles.meta}>{today}</Text>
        </View>

        <Text style={styles.clientLine}>Krok 02 — Jak investovat</Text>

        {/* Koláč složení podle tříd aktiv (bod 3) */}
        <AssetClassPiePdf allocation={allocation} />

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
              borderBottomColor: "rgba(26,26,26,0.18)",
              gap: 10,
            }}
          >
            <View style={{ width: 14 }} />
            <Text style={[styles.fundColTicker, { color: "#7C7570", fontSize: 7, letterSpacing: 1 }]}>
              TICKER
            </Text>
            <Text style={[styles.fundColName, { color: "#7C7570", fontSize: 7, letterSpacing: 1 }]}>
              FOND / ROLE
            </Text>
            <Text style={[styles.fundColMini, { color: "#7C7570", fontSize: 7, letterSpacing: 1 }]}>
              TER
            </Text>
            <Text style={[styles.fundColMini, { color: "#7C7570", fontSize: 7, letterSpacing: 1 }]}>
              SRI
            </Text>
            <Text style={[styles.fundColMini, { color: "#7C7570", fontSize: 7, letterSpacing: 1 }]}>
              VÝNOS
            </Text>
            <Text style={[styles.fundColAlloc, { color: "#7C7570", fontSize: 7, letterSpacing: 1, fontFamily: BODY_FONT, fontWeight: 400 }]}>
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
                <Text style={styles.fundColTicker}>{f.ticker}</Text>
                <View style={styles.fundColName}>
                  <Text>{f.shortName}</Text>
                  <Text style={{ fontSize: 7, color: "#7C7570", marginTop: 1 }}>
                    {f.role} · ISIN {f.isin} ·{" "}
                    <Link src={f.url} style={{ color: "#7C7570" }}>
                      justETF.com
                    </Link>
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
                  borderBottomColor: "rgba(26,26,26,0.08)",
                }}
              >
                <Text style={{ fontSize: 9 }}>{f.shortName}</Text>
                <Text style={{ fontSize: 9 }}>{formatCZK(split[id])} / měs</Text>
              </View>
            );
          })}
        </View>

        <Footer label="Investiční portfolio — orientační doporučení." today={today} />
      </Page>

      {/* Page 3 — Náklady a parametry portfolia */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Náklady a parametry</Text>
          <Text style={styles.meta}>{today}</Text>
        </View>

        <Text style={styles.subline}>
          Měsíční úložka {formatCZK(result.monthlyContribution)} rozdělená do{" "}
          {FUND_ORDER.length} fondů.
        </Text>

        {/* Summary metrics */}
        <View style={[styles.metricsRow, { marginTop: 0, borderTopWidth: 0, paddingTop: 0 }]}>
          <View style={styles.portfolioMetricCell}>
            <Text style={styles.inputLabel}>Vážený výnos</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {formatPercent(portfolioMetrics.expectedReturn, 1)}
            </Text>
          </View>
          <View style={styles.portfolioMetricCell}>
            <Text style={styles.inputLabel}>Vážený TER</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {formatPercent(portfolioMetrics.weightedTER, 2)}
            </Text>
          </View>
          <View style={styles.portfolioMetricCell}>
            <Text style={styles.inputLabel}>Vážené SRI</Text>
            <Text style={[styles.bigNumber, { fontSize: 18, marginBottom: 2 }]}>
              {portfolioMetrics.weightedSRI.toFixed(1)} / 7
            </Text>
          </View>
          <View style={styles.portfolioMetricCell}>
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
            color: "#7C7570",
            marginTop: 18,
            lineHeight: 1.5,
          }}
        >
          Zdroj dat (TER, SRI, KID, historický výnos):{" "}
          <Link src="https://www.justetf.com" style={{ color: "#7C7570" }}>
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

        <Footer label="Náklady a parametry — orientační doporučení." today={today} />
      </Page>

      {/* Page 4 — Slovník pojmů */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Slovník pojmů</Text>
          <Text style={styles.meta}>{today}</Text>
        </View>

        <Text style={styles.subline}>
          Základní důchodové pojmy pro orientaci v reportu.
        </Text>

        <View>
          {GLOSSARY.map((item) => (
            <View
              key={item.term}
              style={{ marginBottom: 9 }}
              wrap={false}
            >
              <Text style={{ fontSize: 9.5, fontWeight: 700, marginBottom: 1 }}>
                {item.term}
              </Text>
              <Text style={{ fontSize: 8.5, color: "#3A3631", lineHeight: 1.45 }}>
                {item.definition}
              </Text>
            </View>
          ))}
        </View>

        <Footer
          label="Slovník pojmů — orientační vysvětlení, nikoli závazný výklad."
          today={today}
        />
      </Page>
    </Document>
  );
}
