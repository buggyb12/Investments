import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  ASSET_CLASS_LABELS,
  assetClassBreakdown,
  type Allocation,
  type AssetClass,
} from "../lib/portfolio";
import { formatPercent } from "../lib/format";

/** Barvy tříd aktiv — ladí s paletou portfolia. */
const ASSET_COLORS: Record<AssetClass, string> = {
  akcie: "#1A1A1A",
  dluhopisy: "#1E3A5C",
  nemovitosti: "#6E7B57",
  alternativy: "#B68A35",
  penezni: "#9A938C",
  ostatni: "#C9C2BB",
};

interface AssetClassPieProps {
  allocation: Allocation;
}

/**
 * Koláčový graf složení portfolia podle tříd aktiv (akcie/dluhopisy/…).
 * Přepočítává se živě dle vybrané strategie a ručních úprav alokace.
 */
export function AssetClassPie({ allocation }: AssetClassPieProps) {
  const data = assetClassBreakdown(allocation);

  return (
    <div className="flex items-center gap-5">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="weight"
              nameKey="assetClass"
              innerRadius={34}
              outerRadius={62}
              paddingAngle={1}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.assetClass} fill={ASSET_COLORS[d.assetClass]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.assetClass} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: ASSET_COLORS[d.assetClass] }}
            />
            <span className="text-ink/80">{ASSET_CLASS_LABELS[d.assetClass]}</span>
            <span className="num text-muted ml-auto pl-3">
              {formatPercent(d.weight, 0)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
