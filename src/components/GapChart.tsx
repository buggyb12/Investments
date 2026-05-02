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

interface GapChartProps {
  statePension: number;
  targetIncome: number;
}

export function GapChart({ statePension, targetIncome }: GapChartProps) {
  const data = [
    { name: "Státní důchod", value: Math.round(statePension), fill: "#1A1815" },
    { name: "Cílový příjem", value: Math.round(targetIncome), fill: "#9C3D2E" },
  ];

  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 30, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="35%"
        >
          <XAxis
            dataKey="name"
            axisLine={{ stroke: "rgba(26,24,21,0.18)" }}
            tickLine={false}
            tick={{
              fill: "#8B857A",
              fontSize: 11,
              fontFamily: "Inter Tight, sans-serif",
              letterSpacing: "0.05em",
            }}
            interval={0}
          />
          <YAxis hide />
          <Bar dataKey="value">
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: number) => formatCZK(v)}
              style={{
                fill: "#1A1815",
                fontSize: 12,
                fontFamily: "JetBrains Mono, monospace",
                fontWeight: 500,
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
