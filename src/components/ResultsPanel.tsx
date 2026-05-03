import { BlobProvider } from "@react-pdf/renderer";
import { Download, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import type { ScenarioResult } from "../lib/pension";
import type { ClientInputs } from "../state/useClientInputs";
import type { usePortfolio } from "../state/usePortfolio";
import { formatCZK, formatYears } from "../lib/format";
import { MetricCard } from "./MetricCard";
import { GapChart } from "./GapChart";
import { ProjectionChart } from "./ProjectionChart";
import { ClientReport } from "./pdf/ClientReport";

interface ResultsPanelProps {
  result: ScenarioResult;
  inputs: ClientInputs;
  portfolio: ReturnType<typeof usePortfolio>;
}

export function ResultsPanel({ result, inputs, portfolio }: ResultsPanelProps) {
  const noWorkYears = inputs.yearsInsured <= 0;
  const tooLate = result.yearsToRetirement <= 0;

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

      {/* Metric cards: Realita / Očekávání / Rozdíl / Řešení */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10">
        <MetricCard
          index={0}
          step="01"
          title="Realita"
          value={formatCZK(result.statePension.monthly)}
          unit="/ měs"
          description="Orientační odhad státního starobního důchodu podle pravidel ČSSZ pro rok 2025."
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

        <BlobProvider
          document={
            <ClientReport
              result={result}
              inputs={inputs}
              allocation={portfolio.allocation}
              portfolioMetrics={portfolio.metrics}
            />
          }
        >
          {({ url, loading, error }) => {
            if (error) {
              return (
                <span className="text-xs text-accent">Chyba generování PDF</span>
              );
            }
            return (
              <a
                href={url ?? "#"}
                download={`duchod-report-${(inputs.clientName || "klient").replace(/\s+/g, "-").toLowerCase()}.pdf`}
                aria-disabled={loading || !url}
                className={`group inline-flex items-center gap-2 px-5 py-3 bg-ink text-paper text-sm tracking-wide transition-all hover:gap-3 ${
                  loading || !url
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                <Download size={14} />
                <span>{loading ? "Generuji…" : "Stáhnout report (PDF)"}</span>
              </a>
            );
          }}
        </BlobProvider>
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
