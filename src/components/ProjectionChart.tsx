import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCZK } from "../lib/format";
import type { ProjectionPoint } from "../lib/pension";

interface ProjectionChartProps {
  data: ProjectionPoint[];
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted">
        Zadejte plánovaný věk odchodu vyšší než aktuální věk.
      </div>
    );
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="capitalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3C5A3E" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3C5A3E" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="year"
            axisLine={{ stroke: "rgba(26,24,21,0.18)" }}
            tickLine={false}
            tick={{
              fill: "#8B857A",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            interval="preserveStartEnd"
          />
          <YAxis hide />
          <Tooltip
            cursor={{ stroke: "rgba(26,24,21,0.25)", strokeWidth: 1 }}
            contentStyle={{
              background: "#F4F1EA",
              border: "1px solid rgba(26,24,21,0.18)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "JetBrains Mono, monospace",
              padding: "6px 10px",
            }}
            labelStyle={{ color: "#8B857A", fontSize: 10, marginBottom: 2 }}
            formatter={(v: number) => [formatCZK(v), "Kapitál"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#3C5A3E"
            strokeWidth={1.5}
            fill="url(#capitalFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
