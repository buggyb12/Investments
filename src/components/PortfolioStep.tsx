import { motion } from "motion/react";
import { Check, RotateCcw } from "lucide-react";
import { formatCZK, formatPercent } from "../lib/format";
import {
  FUNDS,
  FUND_ORDER,
  PROFILES,
  PROFILE_ORDER,
  splitMonthlyContribution,
  type ProfileId,
} from "../lib/portfolio";
import type { usePortfolio } from "../state/usePortfolio";
import { AllocationBar } from "./AllocationBar";
import { AssetClassPie } from "./AssetClassPie";
import { FundCard } from "./FundCard";

interface PortfolioStepProps {
  monthlyContribution: number;
  requiredYield: number;
  portfolio: ReturnType<typeof usePortfolio>;
}

export function PortfolioStep({
  monthlyContribution,
  requiredYield,
  portfolio,
}: PortfolioStepProps) {
  const split = splitMonthlyContribution(monthlyContribution, portfolio.allocation);
  const yieldGap = portfolio.metrics.expectedReturn - requiredYield;
  const monthlyTERCost = (monthlyContribution * portfolio.metrics.weightedTER) / 12;
  const yearlyTERCost = monthlyContribution * 12 * portfolio.metrics.weightedTER;

  return (
    <section className="space-y-12">
      {/* Section heading */}
      <header className="flex items-end justify-between gap-6 pb-4 border-b border-line">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-2">
            Krok 02
          </p>
          <h2 className="display text-3xl md:text-4xl text-ink leading-tight tracking-tightest">
            Jak investovat —<br />
            <span className="italic">4 fondy, 1 strategie</span>
          </h2>
        </div>
        <div className="text-right shrink-0 hidden md:block">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1">
            Doporučený profil
          </p>
          <p className="display num text-2xl text-ink">
            {PROFILES[portfolio.recommendedProfile].name}
          </p>
        </div>
      </header>

      {/* Profile chips */}
      <div className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
          Investiční profil
        </p>
        <div className="flex flex-wrap gap-2">
          {PROFILE_ORDER.map((id) => (
            <ProfileChip
              key={id}
              id={id}
              active={portfolio.selectedProfile === id && !portfolio.manuallyOverridden}
              recommended={id === portfolio.recommendedProfile}
              onClick={() => portfolio.selectProfile(id)}
            />
          ))}
          {portfolio.manuallyOverridden && (
            <button
              type="button"
              onClick={portfolio.reset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink transition-colors border border-line border-dashed"
            >
              <RotateCcw size={12} />
              Vrátit na {PROFILES[portfolio.recommendedProfile].name.toLowerCase()}
            </button>
          )}
        </div>
        <p className="text-sm text-muted leading-relaxed max-w-2xl">
          {portfolio.selectedProfile
            ? PROFILES[portfolio.selectedProfile].description
            : "Vlastní alokace"}
        </p>
      </div>

      {/* Allocation bar + asset-class pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Rozložení podle fondů {portfolio.manuallyOverridden && "— upraveno"}
          </p>
          <AllocationBar allocation={portfolio.allocation} />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Složení podle tříd aktiv
          </p>
          <AssetClassPie allocation={portfolio.allocation} />
        </div>
      </div>

      {/* Fund cards 2x2 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-5"
      >
        {FUND_ORDER.map((id) => (
          <FundCard
            key={id}
            fund={FUNDS[id]}
            weight={portfolio.allocation[id] ?? 0}
            monthlyAmount={split[id]}
            onChange={portfolio.adjust}
          />
        ))}
      </motion.div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 pt-6 border-t border-line">
        <Metric
          label="Vážený výnos"
          value={formatPercent(portfolio.metrics.expectedReturn, 1)}
          tone={yieldGap >= -0.001 ? "positive" : "negative"}
          hint={
            yieldGap >= -0.001
              ? `Splňuje cíl ${formatPercent(requiredYield, 1)}`
              : `Nedosahuje cíle ${formatPercent(requiredYield, 1)}`
          }
        />
        <Metric
          label="Vážený TER"
          value={formatPercent(portfolio.metrics.weightedTER, 2)}
          hint={`${formatCZK(yearlyTERCost)} / rok poplatků`}
        />
        <Metric
          label="Vážené riziko"
          value={`${portfolio.metrics.weightedSRI.toFixed(1)} / 7`}
          hint="SRI škála KID"
        />
        <Metric
          label="Měsíčně investovat"
          value={formatCZK(monthlyContribution)}
          hint={`z toho ${formatCZK(monthlyTERCost)} TER`}
        />
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-muted leading-relaxed pt-6 border-t border-line space-y-1">
        <p>
          Zdroj dat (TER, SRI, KID, historický výnos):{" "}
          <a
            href="https://www.justetf.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-dotted underline-offset-4 hover:text-ink"
          >
            justETF.com
          </a>{" "}
          — klikni na ticker fondu nahoře a otevře se jeho profil v novém okně.
        </p>
        <p>
          * Vstupní poplatek 0 % platí pro samotný ETF. Skutečné náklady na nákup
          závisí na vybraném brokerovi (XTB, Fio, Patria, Interactive Brokers, Trading 212…)
          — typicky komise 0,1–0,5 % za obchod nebo paušál.
        </p>
        <p>
          Historické výnosy nejsou zárukou budoucích. Existuje měnové riziko (CZK vs.
          USD/EUR fondu). Pro osvobození od daně z příjmu platí 3letý časový test
          mezi nákupem a prodejem.
        </p>
        <p>
          Toto je orientační doporučení, nikoli investiční poradenství dle § 4 ZPKT.
        </p>
      </div>
    </section>
  );
}

function ProfileChip({
  id,
  active,
  recommended,
  onClick,
}: {
  id: ProfileId;
  active: boolean;
  recommended: boolean;
  onClick: () => void;
}) {
  const profile = PROFILES[id];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-center gap-2 px-4 py-2 text-sm border transition-all ${
        active
          ? "bg-ink text-paper border-ink"
          : "bg-transparent text-ink/80 border-line hover:border-ink"
      }`}
    >
      {active && <Check size={12} />}
      <span>{profile.name}</span>
      {recommended && !active && (
        <span className="text-[10px] uppercase tracking-[0.18em] text-muted group-hover:text-ink/80">
          doporučeno
        </span>
      )}
    </button>
  );
}

function Metric({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const valueColor =
    tone === "positive"
      ? "text-secondary"
      : tone === "negative"
        ? "text-accent"
        : "text-ink";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-2">
        {label}
      </p>
      <p className={`display num text-2xl ${valueColor} leading-tight`}>{value}</p>
      {hint && (
        <p className="text-xs text-muted mt-1.5 leading-relaxed">{hint}</p>
      )}
    </div>
  );
}
