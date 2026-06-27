import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { formatCZK } from "../lib/format";

interface RetirementValueChartProps {
  /** Cílový příjem v dnešní kupní síle (co si klient přeje). */
  target: number;
  /** Odhad státního důchodu v dnešní kupní síle. */
  todayValue: number;
  /** Odhad téhož důchodu nominálně v roce odchodu. */
  nominalValue: number;
  /** Rok odchodu do důchodu (přiznání). */
  retirementYear: number;
}

/**
 * Tři sloupce, které klientovi na první pohled ukážou rozdíl mezi dnešní a
 * budoucí hodnotou důchodu:
 *   🎯 cíl (dnešní hodnota) · 📊 odhad v dnešních cenách · 📈 odhad v roce odchodu.
 * Pod grafem časová osa „dnešek → rok odchodu" s poznámkou o růstu mezd a valorizaci.
 */
export function RetirementValueChart({
  target,
  todayValue,
  nominalValue,
  retirementYear,
}: RetirementValueChartProps) {
  const currentYear = new Date().getFullYear();
  const data = [
    { name: "🎯 Můj cíl", sub: "dnešní hodnota", value: Math.round(target), fill: "#E94E1B" },
    {
      name: "📊 Odhad dnes",
      sub: "v dnešních cenách",
      value: Math.round(todayValue),
      fill: "#1A1A1A",
    },
    {
      name: `📈 Odhad ${retirementYear}`,
      sub: "nominálně",
      value: Math.round(nominalValue),
      fill: "#1E3A5C",
    },
  ];

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 30, right: 0, bottom: 0, left: 0 }}
            barCategoryGap="28%"
          >
            <XAxis
              dataKey="name"
              axisLine={{ stroke: "rgba(26,26,26,0.18)" }}
              tickLine={false}
              tick={{
                fill: "#7C7570",
                fontSize: 11,
                fontFamily: "Inter Tight, sans-serif",
                letterSpacing: "0.03em",
              }}
              interval={0}
            />
            <YAxis hide />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v: number) => formatCZK(v)}
                style={{
                  fill: "#1A1A1A",
                  fontSize: 13,
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600,
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Časová osa dnešek → rok odchodu */}
      <div className="mt-3 px-1">
        <div className="relative h-px bg-line">
          <span className="absolute left-0 -top-1.5 w-2 h-2 rounded-full bg-ink" />
          <span className="absolute right-0 -top-1.5 w-2 h-2 rounded-full bg-secondary" />
        </div>
        <div className="flex justify-between num text-[11px] text-muted mt-1.5">
          <span>{currentYear}</span>
          <span className="text-[10px] not-italic uppercase tracking-[0.18em]">
            růst mezd a valorizace důchodů
          </span>
          <span>{retirementYear}</span>
        </div>
      </div>
    </div>
  );
}
