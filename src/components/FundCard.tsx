import { ExternalLink } from "lucide-react";
import { ALLOCATION_FILL } from "./AllocationBar";
import { formatCZK, formatPercent } from "../lib/format";
import type { ETF, FundId } from "../lib/portfolio";

interface FundCardProps {
  fund: ETF;
  weight: number;
  monthlyAmount: number;
  onChange: (id: FundId, value: number) => void;
}

export function FundCard({ fund, weight, monthlyAmount, onChange }: FundCardProps) {
  const pct = Math.round(weight * 100);

  return (
    <article className="border border-line p-5 space-y-4 bg-paper/60 hover:bg-paper transition-colors">
      <header className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-muted"
          >
            <span
              className="inline-block h-2 w-2"
              style={{ backgroundColor: ALLOCATION_FILL[fund.id] }}
            />
            {fund.role}
          </span>
          <a
            href={fund.url}
            target="_blank"
            rel="noopener noreferrer"
            className="num text-[10px] text-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
            title={`Otevřít ${fund.ticker} na justETF (zdroj KID/SRI/TER)`}
          >
            {fund.ticker}
            <ExternalLink size={10} />
          </a>
        </div>
        <h3 className="display text-lg leading-tight text-ink">
          <a
            href={fund.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline decoration-dotted underline-offset-4"
          >
            {fund.shortName}
          </a>
        </h3>
        <p className="text-[10px] text-muted num">ISIN {fund.isin}</p>
        <p className="text-xs text-muted leading-relaxed">{fund.description}</p>
      </header>

      <dl className="grid grid-cols-3 gap-x-3 gap-y-2 text-xs border-t border-line pt-3">
        <Stat label="TER" value={formatPercent(fund.ter, 2)} hint="ročně, zahrnuje správu" />
        <Stat label="SRI" value={`${fund.sri} / 7`} hint="riziko (KID)" />
        <Stat
          label="Výnos 10 let"
          value={formatPercent(fund.expectedAnnualReturn, 1)}
          hint="hist., orientačně"
        />
        <Stat label="Vstupní" value={formatPercent(fund.entryFee, 2)} hint="0 % ETF*" />
        <Stat label="Správa" value="v TER" hint="zahrnuto v TER" />
        <Stat label="Výstupní" value={formatPercent(fund.exitFee, 2)} hint="0 %" />
      </dl>

      <div className="space-y-2 pt-1">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted">
            Podíl
          </span>
          <span className="num text-2xl text-ink display">{pct} %</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => onChange(fund.id, Number(e.target.value) / 100)}
          aria-label={`Podíl fondu ${fund.shortName}`}
        />
        <p className="text-[11px] text-muted num">
          z měsíční úložky → {formatCZK(monthlyAmount)} / měs
        </p>
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div>
      <dt className="text-[9px] uppercase tracking-[0.18em] text-muted mb-0.5">
        {label}
      </dt>
      <dd className="num text-sm text-ink leading-tight">{value}</dd>
      {hint && <p className="text-[10px] text-muted/80 mt-0.5">{hint}</p>}
    </div>
  );
}
