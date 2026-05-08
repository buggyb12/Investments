import { motion } from "motion/react";
import { useClientInputs } from "./state/useClientInputs";
import { usePortfolio } from "./state/usePortfolio";
import { InputForm } from "./components/InputForm";
import { ResultsPanel } from "./components/ResultsPanel";
import { PortfolioStep } from "./components/PortfolioStep";
import { DownloadReportButton } from "./components/DownloadReportButton";

export function App() {
  const { inputs, result, set, setDetailed, setYear, fillAllYears } =
    useClientInputs();
  const portfolio = usePortfolio(result.yearsToRetirement);

  return (
    <div className="relative z-10 min-h-screen">
      {/* Top bar */}
      <header className="border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-5 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <span className="display text-2xl font-medium tracking-tightest text-ink">
              Důchod
              <span className="text-accent">.</span>
            </span>
            <span className="hidden sm:inline text-[11px] uppercase tracking-[0.25em] text-muted">
              Kalkulačka pro poradce
            </span>
          </div>
          <DownloadReportButton
            result={result}
            inputs={inputs}
            allocation={portfolio.allocation}
            portfolioMetrics={portfolio.metrics}
            variant="ghost"
            label="Stáhnout PDF"
          />
        </div>
      </header>

      {/* Hero strip */}
      <section className="border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-16 grid grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
            className="col-span-12 md:col-span-8"
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted mb-4">
              Realita → Očekávání → Rozdíl → Řešení
            </p>
            <h1 className="display text-4xl md:text-6xl text-ink leading-[1.02] tracking-tightest">
              Kolik bude{" "}
              <span className="italic text-accent">opravdu</span>
              <br />
              stačit v důchodu?
            </h1>
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="col-span-12 md:col-span-4 text-sm text-ink/70 leading-relaxed self-end"
          >
            Orientační kalkulačka státního důchodu, gap analýzy a potřebné
            měsíční úložky. Vstupy upravujte vlevo — výsledky a PDF report se
            přepočítávají živě.
          </motion.p>
        </div>
      </section>

      {/* Main: form + results */}
      <main className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 md:py-16">
        <div className="grid grid-cols-12 gap-x-10 gap-y-16">
          <section className="col-span-12 lg:col-span-5">
            <InputForm
              inputs={inputs}
              onChange={set}
              setDetailed={setDetailed}
              setYear={setYear}
              fillAllYears={fillAllYears}
            />
          </section>
          <section className="col-span-12 lg:col-span-7">
            <ResultsPanel result={result} inputs={inputs} portfolio={portfolio} />
          </section>
        </div>

        {/* Krok 2 — investiční portfolio */}
        <div className="mt-24 pt-12 border-t border-line">
          <PortfolioStep
            monthlyContribution={result.monthlyContribution}
            requiredYield={inputs.accumulationYield}
            portfolio={portfolio}
          />
        </div>

        {/* Final CTA */}
        <div className="mt-20 pt-10 border-t border-line flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-md">
            <p className="display text-2xl text-ink leading-tight">
              Stáhnout report pro klienta
            </p>
            <p className="text-xs text-muted leading-relaxed">
              Dvě stránky A4: gap analýza + investiční portfolio s alokací,
              fondy a měsíčním rozdělením úložky.
            </p>
          </div>
          <DownloadReportButton
            result={result}
            inputs={inputs}
            allocation={portfolio.allocation}
            portfolioMetrics={portfolio.metrics}
            label="Stáhnout report (PDF)"
          />
        </div>
      </main>

      <footer className="border-t border-line mt-16">
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-muted">
          <p>
            Orientační výpočet podle pravidel MPSV / ČSSZ pro rok 2025. Není
            závazným výpočtem důchodu.
          </p>
          <p className="num">Důchod.kalkulačka — v0.1</p>
        </div>
      </footer>
    </div>
  );
}
