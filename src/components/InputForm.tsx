import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Field } from "./Field";
import { formatCZK, formatPercent, formatYears } from "../lib/format";
import type { ClientInputs } from "../state/useClientInputs";
import type { IncomeType } from "../lib/pension";

interface InputFormProps {
  inputs: ClientInputs;
  onChange: (patch: Partial<ClientInputs>) => void;
}

const INCOME_TYPES: { value: IncomeType; label: string; hint: string }[] = [
  { value: "employee", label: "Zaměstnanec", hint: "Hrubá mzda" },
  {
    value: "selfEmployed",
    label: "OSVČ",
    hint: "Měsíční zisk — pozor, optimalizace daní snižuje budoucí důchod",
  },
  {
    value: "businessOwner",
    label: "Podnikatel (s.r.o.)",
    hint: "Kombinace mzdy a podílů na zisku",
  },
];

export function InputForm({ inputs, onChange }: InputFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const incomeHint = INCOME_TYPES.find(t => t.value === inputs.incomeType)?.hint;

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => e.preventDefault()}
      autoComplete="off"
    >
      {/* — Klient — */}
      <section className="space-y-6">
        <SectionHeader index="01" title="Klient" />

        <Field label="Jméno klienta (volitelné)" htmlFor="clientName">
          <input
            id="clientName"
            type="text"
            className="input-base"
            placeholder="např. Jan Novák"
            value={inputs.clientName}
            onChange={(e) => onChange({ clientName: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field label="Datum narození" htmlFor="birthDate">
            <input
              id="birthDate"
              type="date"
              className="input-base num"
              value={inputs.birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => onChange({ birthDate: e.target.value })}
            />
          </Field>

          <Field label="Pohlaví" htmlFor="gender">
            <SegmentedControl
              value={inputs.gender}
              onChange={(v) => onChange({ gender: v as "male" | "female" })}
              options={[
                { value: "male", label: "Muž" },
                { value: "female", label: "Žena" },
              ]}
            />
          </Field>
        </div>
      </section>

      {/* — Příjmy — */}
      <section className="space-y-6">
        <SectionHeader index="02" title="Příjmy & práce" />

        <Field label="Typ příjmu" hint={incomeHint}>
          <SegmentedControl
            value={inputs.incomeType}
            onChange={(v) => onChange({ incomeType: v as IncomeType })}
            options={INCOME_TYPES.map((t) => ({ value: t.value, label: t.label }))}
          />
        </Field>

        <Field
          label="Hrubý měsíční příjem"
          htmlFor="grossMonthly"
          trailing={
            <span className="num text-xs text-muted">
              {formatCZK(inputs.grossMonthly)}
            </span>
          }
        >
          <input
            id="grossMonthly"
            type="number"
            min={0}
            step={1000}
            className="input-base num text-lg"
            value={inputs.grossMonthly || ""}
            onChange={(e) => onChange({ grossMonthly: Number(e.target.value) || 0 })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-5">
          <Field
            label="Odpracované roky"
            htmlFor="yearsInsured"
            trailing={<span className="num text-xs text-muted">{inputs.yearsInsured} let</span>}
          >
            <input
              id="yearsInsured"
              type="number"
              min={0}
              max={50}
              className="input-base num"
              value={inputs.yearsInsured}
              onChange={(e) =>
                onChange({ yearsInsured: Math.max(0, Number(e.target.value) || 0) })
              }
            />
          </Field>

          <Field
            label="Plánovaný věk odchodu"
            htmlFor="retirementAge"
            trailing={<span className="num text-xs text-muted">{inputs.plannedRetirementAge} let</span>}
          >
            <input
              id="retirementAge"
              type="number"
              min={50}
              max={75}
              className="input-base num"
              value={inputs.plannedRetirementAge}
              onChange={(e) =>
                onChange({ plannedRetirementAge: Number(e.target.value) || 65 })
              }
            />
          </Field>
        </div>
      </section>

      {/* — Cíl — */}
      <section className="space-y-6">
        <SectionHeader index="03" title="Cíl v důchodu" />

        <Field
          label="Cílový příjem (% současného)"
          trailing={
            <span className="num text-xs text-muted">
              {formatPercent(inputs.replacementRate)}
            </span>
          }
          hint="Kolik procent dnešního příjmu chce klient mít v důchodu (typicky 60–80 %)."
        >
          <input
            type="range"
            min={50}
            max={90}
            step={5}
            value={Math.round(inputs.replacementRate * 100)}
            onChange={(e) =>
              onChange({ replacementRate: Number(e.target.value) / 100 })
            }
          />
        </Field>

        <Field
          label="Doba čerpání kapitálu"
          trailing={
            <span className="num text-xs text-muted">
              {formatYears(inputs.withdrawalYears)}
            </span>
          }
          hint="Jak dlouho má kapitál vydržet po odchodu do důchodu."
        >
          <input
            type="range"
            min={15}
            max={30}
            step={1}
            value={inputs.withdrawalYears}
            onChange={(e) => onChange({ withdrawalYears: Number(e.target.value) })}
          />
        </Field>

        <Field
          label="Již naspořeno (volitelné)"
          htmlFor="currentSavings"
          trailing={
            <span className="num text-xs text-muted">
              {formatCZK(inputs.currentSavings)}
            </span>
          }
        >
          <input
            id="currentSavings"
            type="number"
            min={0}
            step={10000}
            className="input-base num"
            value={inputs.currentSavings || ""}
            placeholder="0"
            onChange={(e) =>
              onChange({ currentSavings: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
      </section>

      {/* — Pokročilé — */}
      <section>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted hover:text-ink transition-colors"
        >
          <span>Pokročilé — výnosy</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>

        {showAdvanced && (
          <div className="space-y-6 mt-6 pl-4 border-l border-line">
            <Field
              label="Výnos během akumulace (p.a.)"
              trailing={
                <span className="num text-xs text-muted">
                  {formatPercent(inputs.accumulationYield)}
                </span>
              }
              hint="Předpokládaný roční výnos investice před důchodem. Vyšší výnos = vyšší riziko."
            >
              <input
                type="range"
                min={2}
                max={8}
                step={0.5}
                value={Math.round(inputs.accumulationYield * 100 * 10) / 10}
                onChange={(e) =>
                  onChange({ accumulationYield: Number(e.target.value) / 100 })
                }
              />
            </Field>

            <Field
              label="Výnos během čerpání (p.a.)"
              trailing={
                <span className="num text-xs text-muted">
                  {formatPercent(inputs.withdrawalYield)}
                </span>
              }
              hint="Konzervativnější — kapitál v důchodu se obvykle drží méně rizikově."
            >
              <input
                type="range"
                min={0}
                max={5}
                step={0.5}
                value={Math.round(inputs.withdrawalYield * 100 * 10) / 10}
                onChange={(e) =>
                  onChange({ withdrawalYield: Number(e.target.value) / 100 })
                }
              />
            </Field>
          </div>
        )}
      </section>
    </form>
  );
}

function SectionHeader({ index, title }: { index: string; title: string }) {
  return (
    <header className="flex items-center justify-between pb-3 border-b border-line">
      <h2 className="display text-xl text-ink">{title}</h2>
      <span className="num text-xs text-muted">{index}</span>
    </header>
  );
}

interface SegmentedControlProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

function SegmentedControl({ value, onChange, options }: SegmentedControlProps) {
  return (
    <div className="inline-flex border border-line rounded-none overflow-hidden">
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-ink text-paper"
                : "bg-transparent text-ink/70 hover:text-ink"
            } ${i > 0 ? "border-l border-line" : ""}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
