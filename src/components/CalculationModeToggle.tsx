import { Calculator, FileText } from "lucide-react";
import type { CalculationMode } from "../state/useClientInputs";

interface CalculationModeToggleProps {
  mode: CalculationMode;
  onChange: (mode: CalculationMode) => void;
}

export function CalculationModeToggle({ mode, onChange }: CalculationModeToggleProps) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">
        Způsob výpočtu důchodu
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ModeCard
          active={mode === "approximation"}
          onClick={() => onChange("approximation")}
          icon={<Calculator size={16} />}
          title="Rychlý odhad"
          subtitle="3 vstupy · 30 sekund"
          description="Hrubý měsíční příjem × roky pojištění + zjednodušený MPSV vzorec. Vhodné pro screeningový pohovor."
        />
        <ModeCard
          active={mode === "detailed"}
          onClick={() => onChange("detailed")}
          icon={<FileText size={16} />}
          title="Detailní výpočet"
          subtitle="IVK PDF z ČSSZ nebo ručně"
          description="Skutečné roční vyměřovací základy 1986+, indexované oficiálními koeficienty. Velmi blízko reálnému výpočtu ČSSZ."
        />
      </div>
    </div>
  );
}

interface ModeCardProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
}

function ModeCard({ active, onClick, icon, title, subtitle, description }: ModeCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 border transition-all ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-line bg-paper/40 text-ink hover:border-ink/40"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className={active ? "text-paper" : "text-accent"}>{icon}</span>
        <span className="display text-base font-medium">{title}</span>
      </div>
      <p
        className={`text-[10px] uppercase tracking-[0.18em] mb-2 ${
          active ? "text-paper/70" : "text-muted"
        }`}
      >
        {subtitle}
      </p>
      <p
        className={`text-xs leading-relaxed ${
          active ? "text-paper/85" : "text-ink/70"
        }`}
      >
        {description}
      </p>
    </button>
  );
}
