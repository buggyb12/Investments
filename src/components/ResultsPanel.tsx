import { useState } from "react";
import { AlertCircle, ChevronDown, Info } from "lucide-react";
import { motion } from "motion/react";
import type { ScenarioResult } from "../lib/pension";
import type { ClientInputs, PensionInsights } from "../state/useClientInputs";
import type { usePortfolio } from "../state/usePortfolio";
import {
  DOBA_POJISTENI_NAROK,
  INVALIDITA_STUPNE,
  pozadovanaDobaPojisteni,
  type InvalidniVysledek,
} from "../lib/pension-detailed";
import { formatCZK, formatPercent, formatYears } from "../lib/format";
import { MetricCard } from "./MetricCard";
import { GapChart } from "./GapChart";
import { ProjectionChart } from "./ProjectionChart";
import { RetirementValueChart } from "./RetirementValueChart";
import { GlossarySection } from "./GlossarySection";
import { DownloadReportButton } from "./DownloadReportButton";

interface ResultsPanelProps {
  result: ScenarioResult;
  inputs: ClientInputs;
  insights?: PensionInsights;
  portfolio: ReturnType<typeof usePortfolio>;
  /** Měsíční příjem odvozený z IVK (detailní mód) — do PDF místo defaultů. */
  effectiveGross?: number;
}

/** Formátuje důchodový věk z {roky, měsíce} na čitelný text. */
function formatVek(roky: number, mesice: number): string {
  if (mesice === 0) return formatYears(roky);
  return `${formatYears(roky)} ${mesice} měs`;
}

export function ResultsPanel({
  result,
  inputs,
  insights,
  portfolio,
  effectiveGross,
}: ResultsPanelProps) {
  const noWorkYears =
    inputs.mode === "approximation" && inputs.yearsInsured <= 0;
  const tooLate = result.yearsToRetirement <= 0;
  const [showRealitaDetail, setShowRealitaDetail] = useState(false);
  const [showInvalidConditions, setShowInvalidConditions] = useState(false);

  // Aktuální věk klienta — pro podmínky vzniku nároku na invalidní důchod.
  const birth = new Date(inputs.birthDate);
  const clientAge = Number.isNaN(birth.getTime())
    ? 40
    : Math.floor(
        (Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      );

  const sp = result.statePension;
  const showsNominalDivergence =
    sp.rokPriznani > new Date().getFullYear() &&
    Math.abs(sp.monthlyNominal - sp.monthly) > 1;
  const nominalDiff = sp.monthlyNominal - sp.monthly;
  const realitaSubValue = showsNominalDivergence
    ? `nominálně v r. ${sp.rokPriznani}: ${formatCZK(sp.monthlyNominal)} / měs`
    : undefined;

  // Bod 4 — porovnání zvoleného věku odchodu se zákonným důchodovým věkem.
  const zakonnyVek = insights?.zakonnyVek;
  const zakonnyVekDecimal = zakonnyVek
    ? zakonnyVek.roky + zakonnyVek.mesice / 12
    : null;
  const vekRozdil =
    zakonnyVekDecimal !== null
      ? inputs.plannedRetirementAge - zakonnyVekDecimal
      : null;

  return (
    <div className="space-y-12">
      {/* Header strip */}
      <div className="flex items-end justify-between gap-6 pb-4 border-b border-line">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-2">
            Výstup pro klienta
          </p>
          <h2 className="display text-3xl md:text-4xl text-ink leading-tight">
            {inputs.clientName ? (
              <>
                Pro <span className="italic">{inputs.clientName}</span>
              </>
            ) : (
              "Vaše čísla"
            )}
          </h2>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1">
            Do důchodu
          </p>
          <p className="display num text-2xl text-ink">
            {formatYears(result.yearsToRetirement)}
          </p>
        </div>
      </div>

      {/* Bod 4 — zvolený věk odchodu vs. zákonný důchodový věk */}
      {zakonnyVek && (
        <div className="grid grid-cols-3 gap-px bg-line border border-line text-center">
          <div className="bg-paper px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              Plán klienta
            </p>
            <p className="display num text-xl text-ink">
              {formatYears(inputs.plannedRetirementAge)}
            </p>
            <p className="text-[10px] text-muted mt-0.5">věk odchodu</p>
          </div>
          <div className="bg-paper px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              Zákonný nárok
            </p>
            <p className="display num text-xl text-ink">
              {formatVek(zakonnyVek.roky, zakonnyVek.mesice)}
            </p>
            <p className="text-[10px] text-muted mt-0.5">řádný starobní důchod</p>
          </div>
          <div className="bg-paper px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
              Rozdíl
            </p>
            <p className="display num text-xl text-accent">
              {vekRozdil !== null && Math.abs(vekRozdil) < 0.04
                ? "0"
                : `${vekRozdil !== null && vekRozdil > 0 ? "+" : ""}${vekRozdil?.toFixed(1)}`}{" "}
              <span className="text-sm text-muted">let</span>
            </p>
            <p className="text-[10px] text-muted mt-0.5">
              {vekRozdil !== null && vekRozdil < -0.04
                ? "odchod dříve než nárok"
                : vekRozdil !== null && vekRozdil > 0.04
                  ? "odchod později než nárok"
                  : "shodný s nárokem"}
            </p>
          </div>
        </div>
      )}

      {/* Warnings */}
      {(noWorkYears || tooLate) && (
        <div className="flex gap-3 items-start text-sm border border-accent/30 bg-accent/5 px-4 py-3">
          <AlertCircle size={16} className="text-accent mt-0.5 shrink-0" />
          <div>
            {noWorkYears && (
              <p>Bez odpracovaných let není nárok na starobní důchod.</p>
            )}
            {tooLate && (
              <p>Plánovaný věk odchodu je nižší než aktuální věk klienta.</p>
            )}
          </div>
        </div>
      )}

      {/* Today's-purchasing-power explainer banner */}
      <aside className="flex gap-3 items-start text-sm border-l-4 border-accent bg-accent/5 px-4 py-3">
        <Info size={16} className="text-accent mt-0.5 shrink-0" />
        <div className="space-y-2 text-xs leading-relaxed text-ink/80">
          <p>
            <strong>Hodnoty jsou v dnešní kupní síle.</strong> Pro klientskou
            prezentaci pracujeme s konzervativnější variantou — kolik si dnes
            ({new Date().getFullYear()}) za vyplácený důchod reálně koupíte.
            Nominální budoucí korunu jsme deflátovali inflací{" "}
            {formatPercent(inputs.inflation, 1)} p.a.
          </p>
          <p className="text-muted">
            <strong className="text-ink/70">Dnešní kupní síla</strong> = co dnes
            za to nakoupíš.{" "}
            <strong className="text-ink/70">Nominál</strong> = částka v korunách
            roku přiznání důchodu (vyšší číslo, ale zahrnuje budoucí inflaci).
          </p>
        </div>
      </aside>

      {/* Metric cards: Realita / Očekávání / Rozdíl / Řešení */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
        <MetricCard
          index={0}
          step="01"
          title="Realita"
          value={formatCZK(result.statePension.monthly)}
          unit="/ měs"
          subValue={showsNominalDivergence ? undefined : realitaSubValue}
          description="Orientační odhad státního starobního důchodu v dnešní kupní síle."
          footer={
            showsNominalDivergence ? (
              <div className="num text-[11px] border-t border-line/50 pt-2 space-y-1">
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Dnešní kupní síla</span>
                  <span className="text-ink font-medium">
                    {formatCZK(sp.monthly)}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">
                    Nominálně (r. {sp.rokPriznani})
                  </span>
                  <span className="text-ink">{formatCZK(sp.monthlyNominal)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted">Rozdíl vlivem inflace</span>
                  <span className="text-accent">−{formatCZK(nominalDiff)}</span>
                </div>
              </div>
            ) : undefined
          }
        />
        <MetricCard
          index={1}
          step="02"
          title="Očekávání"
          value={formatCZK(result.targetIncome)}
          unit="/ měs"
          description={`Pro zachování životní úrovně — ${Math.round(inputs.replacementRate * 100)} % současného příjmu.`}
        />
        <MetricCard
          index={2}
          step="03"
          title="Rozdíl"
          value={formatCZK(result.monthlyGap)}
          unit="/ měs"
          tone="accent"
          description={
            result.monthlyGap === 0
              ? "Státní důchod sám pokryje cílový příjem — žádný gap."
              : "Měsíční částka, kterou si klient musí pokrýt z vlastních zdrojů."
          }
        />
        <MetricCard
          index={3}
          step="04"
          title="Řešení"
          value={formatCZK(result.monthlyContribution)}
          unit="/ měs"
          tone="secondary"
          description={solutionDescription({ result, inputs })}
        />
      </div>

      {/* Dnešní cíl vs. dnešní odhad vs. budoucí nominální hodnota */}
      {sp.monthly > 0 && (
        <section className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1">
              Dnešní cíl vs. budoucí hodnota důchodu
            </p>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Částka {formatCZK(sp.monthly)} <strong>neznamená</strong>, že klient
              bude v roce {sp.rokPriznani} pobírat jen {formatCZK(sp.monthly)} —
              jde o přepočet do dnešních cen. Skutečně vyplácený důchod bude
              nominálně vyšší ({formatCZK(sp.monthlyNominal)}) vlivem růstu mezd a
              valorizací.
            </p>
          </div>
          <RetirementValueChart
            target={result.targetIncome}
            todayValue={sp.monthly}
            nominalValue={sp.monthlyNominal}
            retirementYear={sp.rokPriznani}
          />
        </section>
      )}

      {/* Detail výpočtu — nominal vs today */}
      {showsNominalDivergence && (
        <div>
          <button
            type="button"
            onClick={() => setShowRealitaDetail((v) => !v)}
            className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted hover:text-ink transition-colors"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showRealitaDetail ? "rotate-180" : ""}`}
            />
            <span>{showRealitaDetail ? "Skrýt" : "Zobrazit"} detail výpočtu</span>
          </button>
          {showRealitaDetail && (
            <div className="mt-4 border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-muted bg-ink/5">
                    <th className="text-left px-3 py-2 font-medium"> </th>
                    <th className="text-right px-3 py-2 font-medium">
                      Nominálně (rok {sp.rokPriznani})
                    </th>
                    <th className="text-right px-3 py-2 font-medium">
                      V dnešní kupní síle
                    </th>
                  </tr>
                </thead>
                <tbody className="num">
                  <tr className="border-t border-line/40">
                    <td className="px-3 py-2 text-ink/80">Důchod celkem</td>
                    <td className="px-3 py-2 text-right">
                      {formatCZK(sp.monthlyNominal)}
                    </td>
                    <td className="px-3 py-2 text-right text-ink font-medium">
                      {formatCZK(sp.monthly)}
                    </td>
                  </tr>
                  <tr className="border-t border-line/40">
                    <td className="px-3 py-2 text-ink/80">Základní výměra</td>
                    <td className="px-3 py-2 text-right">
                      {formatCZK(sp.basicComponentNominal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCZK(sp.basicComponent)}
                    </td>
                  </tr>
                  <tr className="border-t border-line/40">
                    <td className="px-3 py-2 text-ink/80">Procentní výměra</td>
                    <td className="px-3 py-2 text-right">
                      {formatCZK(sp.percentageComponentNominal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCZK(sp.percentageComponent)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[10px] text-muted px-3 py-2 border-t border-line/40 leading-relaxed">
                Pravý sloupec = co se z důchodu reálně dá nakoupit dnes.
                Pro gap, kapitál a měsíční úložku používáme tuhle hodnotu.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bod 3 — doplnění chybějících dob pojištění */}
      {insights?.doplneniDob && (
        <section className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1">
              Doplnění chybějících dob pojištění
            </p>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Modelace, kdy se{" "}
              <span className="num text-ink">
                {insights.doplneniDob.pocetDoplnenych}
              </span>{" "}
              chybějících let (studium, mateřská, zahraničí…) doplní průměrným
              vyměřovacím základem známých let (
              {formatCZK(insights.doplneniDob.prumernyVz)} / rok).
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-line border border-line text-center">
            <div className="bg-paper px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
                Dle dostupných dat
              </p>
              <p className="display num text-xl text-ink">
                {formatCZK(insights.doplneniDob.aktualni.monthly)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">/ měs</p>
            </div>
            <div className="bg-paper px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
                Po doplnění dob
              </p>
              <p className="display num text-xl text-ink">
                {formatCZK(insights.doplneniDob.poDoplneni.monthly)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">/ měs</p>
            </div>
            <div className="bg-paper px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
                Rozdíl
              </p>
              <p className="display num text-xl text-accent">
                +{formatCZK(insights.doplneniDob.rozdil)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">/ měs</p>
            </div>
          </div>
          <p className="text-[10px] text-muted leading-relaxed">
            Hodnoty v dnešní kupní síle. Doplněné roky se započítávají jako
            odpracovaná doba pojištění. Orientační — skutečné doplnění dob
            posuzuje ČSSZ.
          </p>
        </section>
      )}

      {/* Bod 5 — orientační invalidní důchod I., II. a III. stupně */}
      {insights?.invalidni && (
        <section className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1">
              Invalidní důchod — orientačně
            </p>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Vychází ze stejných vstupních dat jako starobní důchod (výpočtový
              základ + dopočtená doba do důchodového věku). Slouží jako výchozí
              bod pro návrh pojištění výpadku příjmu — kolik by klient v případě
              invalidity reálně pobíral a jak velký výpadek je třeba pokrýt.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-line border border-line text-center">
            {(
              [
                ["I. stupeň", insights.invalidni.st1],
                ["II. stupeň", insights.invalidni.st2],
                ["III. stupeň", insights.invalidni.st3],
              ] as [string, InvalidniVysledek][]
            ).map(([label, v]) => (
              <div key={label} className="bg-paper px-2 py-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted mb-1">
                  {label}
                </p>
                <p className="display num text-xl text-ink">
                  {formatCZK(v.duchodCelkem)}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  / měs · {v.sazbaPct} %/rok
                </p>
              </div>
            ))}
          </div>

          {/* Podmínky vzniku nároku */}
          <div>
            <button
              type="button"
              onClick={() => setShowInvalidConditions((v) => !v)}
              className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted hover:text-ink transition-colors"
            >
              <ChevronDown
                size={14}
                className={`transition-transform ${showInvalidConditions ? "rotate-180" : ""}`}
              />
              <span>
                {showInvalidConditions ? "Skrýt" : "Zobrazit"} podmínky vzniku
                nároku
              </span>
            </button>
            {showInvalidConditions && (
              <div className="mt-4 space-y-5 border border-line p-4 text-xs leading-relaxed text-ink/80">
                <p>
                  Pro nárok na invalidní důchod musí být splněné{" "}
                  <strong>dvě podmínky</strong>:
                </p>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    1. Posouzení zdravotního stavu
                  </p>
                  <ul className="space-y-1">
                    {INVALIDITA_STUPNE.map((s) => (
                      <li key={s.stupen} className="flex gap-2">
                        <span className="text-ink font-medium shrink-0">
                          {s.nazev}:
                        </span>
                        <span>{s.poklesText}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted">
                    Pokles pracovní schopnosti posuzuje posudkový lékař dle
                    vyhlášky č. 359/2009 Sb.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
                    2. Potřebná doba pojištění (podle věku)
                  </p>
                  <table className="w-full num">
                    <tbody>
                      {DOBA_POJISTENI_NAROK.map((r) => (
                        <tr key={r.vek} className="border-t border-line/40">
                          <td className="py-1 pr-3 text-ink/80 whitespace-nowrap align-top">
                            {r.vek}
                          </td>
                          <td className="py-1 text-ink/70">{r.doba}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-muted">
                    Pro klienta ve věku{" "}
                    <span className="num text-ink">{clientAge}</span> let:
                    potřeba {pozadovanaDobaPojisteni(clientAge)}.
                  </p>
                </div>
              </div>
            )}
          </div>

          <p className="text-[10px] text-muted leading-relaxed">
            Předpoklad: invalidita vzniká nyní; dopočtená doba ={" "}
            {insights.invalidni.st3.dopoctenaDobaRoky} let do důchodového věku.
            Orientační odhad, nikoli závazný výpočet ČSSZ.
          </p>
        </section>
      )}

      {/* Srovnání minimálních a vyšších odvodů */}
      {insights?.odvody && (
        <section className="space-y-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1">
              Vliv výše odvodů na důchod
            </p>
            <p className="text-xs text-muted leading-relaxed max-w-xl">
              Pokud si výši odvodů můžete zvolit (OSVČ, majitel s.r.o.):
              kolik vyjde důchod, když budoucí roky budete odvádět z{" "}
              <strong>minimálního</strong> vyměřovacího základu (
              {formatCZK(insights.odvody.minMesic)} / měs) oproti{" "}
              <strong>současné</strong> úrovni.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-line border border-line text-center">
            <div className="bg-paper px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
                Minimální odvody
              </p>
              <p className="display num text-xl text-ink">
                {formatCZK(insights.odvody.minimalni.monthly)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">/ měs</p>
            </div>
            <div className="bg-paper px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
                Současné odvody
              </p>
              <p className="display num text-xl text-ink">
                {formatCZK(insights.odvody.soucasne.monthly)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">/ měs</p>
            </div>
            <div className="bg-paper px-3 py-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted mb-1">
                Rozdíl
              </p>
              <p className="display num text-xl text-accent">
                {insights.odvody.rozdil >= 0 ? "+" : ""}
                {formatCZK(insights.odvody.rozdil)}
              </p>
              <p className="text-[10px] text-muted mt-0.5">/ měs</p>
            </div>
          </div>
          <p className="text-[10px] text-muted leading-relaxed">
            Hodnoty v dnešní kupní síle. Minimální vyměřovací základ orientačně{" "}
            40 % průměrné mzdy (reforma OSVČ). Vyšší odvody = vyšší procentní
            výměra důchodu, ale i vyšší platby pojistného dnes.
          </p>
        </section>
      )}

      {/* Charts */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-10"
      >
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-4">
            Gap — důchod vs. cíl
          </p>
          <GapChart
            statePension={result.statePension.monthly}
            targetIncome={result.targetIncome}
          />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-4">
            Projekce kapitálu do důchodu
          </p>
          <ProjectionChart
            data={result.projection}
            targetCapital={result.requiredCapital}
          />
        </div>
      </motion.section>

      {/* Slovník pojmů */}
      <GlossarySection />

      {/* CTA: Download PDF */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="pt-8 border-t border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <p className="text-xs text-muted max-w-md leading-relaxed">
          Orientační výpočet, není závazný výpočet ČSSZ. Skutečný důchod
          závisí na celoživotních příjmech a aktuálních pravidlech v roce
          odchodu.
        </p>

        <DownloadReportButton
          result={result}
          inputs={inputs}
          allocation={portfolio.allocation}
          portfolioMetrics={portfolio.metrics}
          insights={insights}
          effectiveGross={effectiveGross}
        />
      </motion.div>
    </div>
  );
}

function solutionDescription({
  result,
  inputs,
}: {
  result: ScenarioResult;
  inputs: ClientInputs;
}): string {
  const yieldPct = Math.round(inputs.accumulationYield * 100);

  if (result.requiredCapital <= 0) {
    return "Při zvolených parametrech není potřeba tvořit dodatečný kapitál.";
  }

  if (result.coveredByExistingSavings) {
    return `Vaše stávající úspory ${formatCZK(inputs.currentSavings)} při výnosu ${yieldPct} % p.a. narostou na ${formatCZK(result.existingSavingsFutureValue)} — to už pokryje potřebný kapitál ${formatCZK(result.requiredCapital)}, další odkládání není nutné.`;
  }

  if (inputs.currentSavings > 0) {
    return `Měsíční úložka při výnosu ${yieldPct} % p.a. Stávající úspory ${formatCZK(inputs.currentSavings)} narostou na ${formatCZK(result.existingSavingsFutureValue)}, doplňujete do potřebného kapitálu ${formatCZK(result.requiredCapital)}.`;
  }

  return `Měsíční úložka při výnosu ${yieldPct} % p.a. pro vytvoření kapitálu ${formatCZK(result.requiredCapital)}.`;
}
