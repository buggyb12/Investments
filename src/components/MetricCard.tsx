import { motion } from "motion/react";
import type { ReactNode } from "react";

interface MetricCardProps {
  index: number;
  step: string; // "01", "02", etc.
  title: string; // Realita / Očekávání / Rozdíl / Řešení
  value: string;
  unit?: string;
  description: string;
  tone?: "default" | "accent" | "secondary";
  footer?: ReactNode;
}

export function MetricCard({
  index,
  step,
  title,
  value,
  unit,
  description,
  tone = "default",
  footer,
}: MetricCardProps) {
  const valueColor =
    tone === "accent"
      ? "text-accent"
      : tone === "secondary"
        ? "text-secondary"
        : "text-ink";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative pt-6 pb-7"
    >
      <div className="rule absolute left-0 right-0 top-0" />

      <div className="flex items-center justify-between mb-5">
        <span className="num text-[11px] text-muted">{step}</span>
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted">
          {title}
        </span>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className={`display num text-5xl md:text-6xl font-medium leading-none ${valueColor}`}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted font-body">{unit}</span>
        )}
      </div>

      <p className="text-sm text-ink/70 leading-relaxed max-w-[36ch]">
        {description}
      </p>

      {footer && <div className="mt-4">{footer}</div>}
    </motion.article>
  );
}
