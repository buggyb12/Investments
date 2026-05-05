import {
  Area,
  AreaChart,
  Label,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCZK } from "../lib/format";
import type { ProjectionPoint } from "../lib/pension";

interface ProjectionChartProps {
  data: ProjectionPoint[];
  targetCapital?: number;
}

export function ProjectionChart({ data, targetCapital }: ProjectionChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-muted">
        Zadejte plánovaný věk odchodu vyšší než aktuální věk.
      </div>
    );
  }

  const showTarget =
    typeof targetCapital === "number" &&
    Number.isFinite(targetCapital) &&
    targetCapital > 0;

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 18, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="capitalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E3A5C" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1E3A5C" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="year"
            axisLine={{ stroke: "rgba(26,26,26,0.18)" }}
            tickLine={false}
            tick={{
              fill: "#7C7570",
              fontSize: 10,
              fontFamily: "JetBrains Mono, monospace",
            }}
            interval="preserveStartEnd"
          />
          <YAxis
            hide
            domain={[
              0,
              (dataMax: number) =>
                showTarget ? Math.max(dataMax, targetCapital) * 1.08 : dataMax * 1.05,
            ]}
          />
          <Tooltip
            cursor={{ stroke: "rgba(26,26,26,0.25)", strokeWidth: 1 }}
            contentStyle={{
              background: "#FBF1EC",
              border: "1px solid rgba(26,26,26,0.18)",
              borderRadius: 0,
              fontSize: 12,
              fontFamily: "JetBrains Mono, monospace",
              padding: "6px 10px",
            }}
            labelStyle={{ color: "#7C7570", fontSize: 10, marginBottom: 2 }}
            formatter={(v: number) => [formatCZK(v), "Kapitál"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#1E3A5C"
            strokeWidth={1.5}
            fill="url(#capitalFill)"
          />
          {showTarget && (
            <ReferenceLine
              y={targetCapital}
              stroke="#E94E1B"
              strokeWidth={1}
              strokeDasharray="3 3"
              ifOverflow="extendDomain"
            >
              <Label
                value={`Cíl ${formatCZK(targetCapital)}`}
                position="insideTopRight"
                offset={6}
                style={{
                  fill: "#E94E1B",
                  fontSize: 10,
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.02em",
                }}
              />
            </ReferenceLine>
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
