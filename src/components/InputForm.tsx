import { lazy, Suspense, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Field } from "./Field";
import { formatCZK, formatPercent, formatYears } from "../lib/format";
import type {
  CalculationMode,
  ClientInputs,
  DetailedInputs,
  DetailedYearRow,
  PensionInsights,
} from "../state/useClientInputs";
import type { IncomeType } from "../lib/pension";
import { CalculationModeToggle } from "./CalculationModeToggle";
import { DetailedYearsTable } from "./DetailedYearsTable";
import { birthInfoFromRc } from "../lib/pension-detailed/ivk-parser";
import { statutoryRetirementAge } from "../lib/retirementAge";

const IvkDropZone = lazy(() =>
  import("./IvkDropZone").then((m) => ({ default: m.IvkDropZone })),
);

interface InputFormProps {
  inputs: ClientInputs;
  /** Vypočtený měsíční hrubý příjem (z IVK v detailed módu, jinak ze sekce 02). */
  effectiveGrossMonthly: number;
  insights?: PensionInsights;
  onChange: (patch: Partial<ClientInputs>) => void;
  setDetailed: (patch: Partial<DetailedInputs>) => void;
  setYear: (rok: number, patch: Partial<DetailedYearRow>) => void;
  fillAllYears: (vz: number) => void;
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

export function InputForm({
  inputs,
  effectiveGrossMonthly,
  insights,
  onChange,
  setDetailed,
  setYear,
  fillAllYears,
}: InputFormProps) {
  const targetMonthly = Math.round(
    effectiveGrossMonthly * inputs.replacementRate,
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const incomeHint = INCOME_TYPES.find((t) => t.value === inputs.incomeType)?.hint;

  // Bod 4 — hint se zákonným důchodovým věkem u pole plánovaného věku odchodu.
  const zv = insights?.zakonnyVek;
  const retirementAgeHint = zv
    ? `Zákonný nárok na řádný starobní důchod: ${zv.roky}${
        zv.mesice ? ` r ${zv.mesice} měs` : " let"
      }.`
    : undefined;

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => e.preventDefault()}
      autoComplete="off"
    >
      {/* — Mode toggle — */}
      <CalculationModeToggle
        mode={inputs.mode}
        onChange={(m: CalculationMode) => onChange({ mode: m })}
      />

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

        <Field
          label="Plánovaný věk odchodu"
          htmlFor="retirementAge"
          hint={retirementAgeHint}
          trailing={
            <span className="num text-xs text-muted">
              {inputs.plannedRetirementAge} let
            </span>
          }
        >
          <input
            id="retirementAge"
            type="number"
            min={50}
            max={75}
            className="input-base num"
            value={inputs.plannedRetirementAge}
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) =>
              onChange({ plannedRetirementAge: Number(e.target.value) || 65 })
            }
          />
        </Field>
      </section>

      {/* — Příjmy: branch by mode — */}
      {inputs.mode === "approximation" ? (
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
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) =>
                onChange({ grossMonthly: Number(e.target.value) || 0 })
              }
            />
          </Field>

          <Field
            label="Odpracované roky"
            htmlFor="yearsInsured"
            trailing={
              <span className="num text-xs text-muted">
                {inputs.yearsInsured} let
              </span>
            }
          >
            <input
              id="yearsInsured"
              type="number"
              min={0}
              max={50}
              className="input-base num"
              value={inputs.yearsInsured}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) =>
                onChange({
                  yearsInsured: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          </Field>
        </section>
      ) : (
        <DetailedYearsTable
          detailed={inputs.detailed}
          setDetailed={setDetailed}
          setYear={setYear}
          fillAllYears={fillAllYears}
          pdfDropZone={
            <Suspense
              fallback={
                <div className="text-xs text-muted">Načítám PDF parser…</div>
              }
            >
              <IvkDropZone
                onParsed={(result) => {
                  for (const r of result.rows) {
                    setYear(r.rok, { vz: r.vz, vylouceneDny: r.vylouceneDny });
                  }
                  setDetailed({
                    celkemDnyPojisteni: result.celkemDnyPojisteni ?? undefined,
                    nahradniDny: result.nahradniDny ?? 0,
                    // IDA PDF nese přímý výpočet ČSSZ + počet vychovaných dětí.
                    idaVypocet: result.ida ?? undefined,
                    ...(result.pocetDeti != null
                      ? { pocetDeti: result.pocetDeti }
                      : {}),
                  });
                  // Auto-vyplnění klienta — IDA uvádí datum narození přímo,
                  // u IOLDP ho odvozujeme z RČ. Jinak hrozí výpočet
                  // s defaultním datem narození a špatným rokem odchodu.
                  const info = birthInfoFromRc(result.rc);
                  const patch: Partial<ClientInputs> = {};
                  if (result.jmeno && !inputs.clientName) {
                    patch.clientName = result.jmeno;
                  }
                  if (result.datumNarozeni) {
                    patch.birthDate = result.datumNarozeni;
                  } else if (info) {
                    patch.birthDate = info.birthDate;
                  }
                  if (info) {
                    patch.gender = info.gender;
                    patch.plannedRetirementAge = Math.round(
                      statutoryRetirementAge(info.birthYear, info.gender),
                    );
                  }
                  if (Object.keys(patch).length > 0) onChange(patch);
                }}
              />
            </Suspense>
          }
        />
      )}

      {/* — Cíl — */}
      <section className="space-y-6">
        <SectionHeader index="03" title="Cíl v důchodu" />

        {effectiveGrossMonthly > 0 ? (
          <div className="text-xs text-muted space-y-0.5">
            <p>
              Vypočtený měsíční příjem (z IVK / zadání):{" "}
              <span className="num text-ink">
                {formatCZK(effectiveGrossMonthly)}
              </span>
            </p>
            <p>
              Cílový příjem v důchodu:{" "}
              <span className="num text-ink">{formatCZK(targetMonthly)}</span>{" "}
              ({formatPercent(inputs.replacementRate)})
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted">
            Pro výpočet cílové částky doplň příjem v sekci 02 (nebo nahraj
            IVK PDF).
          </p>
        )}

        <Field
          label="Cílový příjem (% současného)"
          trailing={
            <span className="num text-xs text-muted">
              {formatPercent(inputs.replacementRate)}
            </span>
          }
          hint="Kolik procent dnešního příjmu chce klient mít v důchodu (typicky 60–80 %). Posuvník lze přesáhnout zadáním částky v poli níž."
        >
          <input
            type="range"
            min={50}
            max={150}
            step={5}
            value={Math.min(150, Math.round(inputs.replacementRate * 100))}
            onChange={(e) =>
              onChange({ replacementRate: Number(e.target.value) / 100 })
            }
          />
        </Field>

        <Field
          label="Cílový příjem (Kč / měs)"
          htmlFor="targetMonthly"
          trailing={
            <span className="num text-xs text-muted">
              {effectiveGrossMonthly > 0 ? formatCZK(targetMonthly) : "—"}
            </span>
          }
          hint="Můžeš upravit přímo částku — slider % se přepočítá."
        >
          <input
            id="targetMonthly"
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            className="input-base num"
            disabled={effectiveGrossMonthly === 0}
            value={effectiveGrossMonthly > 0 ? targetMonthly : ""}
            placeholder="0"
            onWheel={(e) => e.currentTarget.blur()}
            onChange={(e) => {
              const czk = Math.max(0, Number(e.target.value) || 0);
              if (effectiveGrossMonthly > 0) {
                onChange({ replacementRate: czk / effectiveGrossMonthly });
              }
            }}
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
            onWheel={(e) => e.currentTarget.blur()}
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

            <Field
              label="Inflace pro deflátor (p.a.)"
              trailing={
                <span className="num text-xs text-muted">
                  {formatPercent(inputs.inflation, 1)}
                </span>
              }
              hint="Pro převod nominálních budoucích korun na dnešní kupní sílu. ČNB cíl je 2 % p.a., konzervativně počítejme 3 %."
            >
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={Math.round(inputs.inflation * 100 * 10) / 10}
                onChange={(e) =>
                  onChange({ inflation: Number(e.target.value) / 100 })
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
