import { motion } from "motion/react";
import { FUND_ORDER, FUNDS, type Allocation } from "../lib/portfolio";

const FILL: Record<keyof Allocation, string> = {
  aggh: "#3C5A3E",
  vwce: "#1A1815",
  cspx: "#9C3D2E",
  sgln: "#B68A35",
};

interface AllocationBarProps {
  allocation: Allocation;
}

export function AllocationBar({ allocation }: AllocationBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full overflow-hidden rounded-none border border-line">
        {FUND_ORDER.map((id) => {
          const w = (allocation[id] ?? 0) * 100;
          if (w <= 0) return null;
          return (
            <motion.div
              key={id}
              layout
              animate={{ width: `${w}%` }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
              style={{ backgroundColor: FILL[id], width: `${w}%` }}
              title={`${FUNDS[id].shortName}: ${w.toFixed(0)} %`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {FUND_ORDER.map((id) => (
          <div key={id} className="flex items-center gap-2 text-[11px]">
            <span
              className="inline-block h-2.5 w-2.5"
              style={{ backgroundColor: FILL[id] }}
            />
            <span className="text-ink/80">{FUNDS[id].shortName}</span>
            <span className="num text-muted">
              {Math.round((allocation[id] ?? 0) * 100)} %
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { FILL as ALLOCATION_FILL };
