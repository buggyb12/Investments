import { useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Wand2 } from "lucide-react";
import { formatCZK } from "../lib/format";
import type { Varianta } from "../lib/pension-detailed";
import {
  effectiveGrossMonthly,
  type DetailedInputs,
  type DetailedYearRow,
} from "../state/useClientInputs";
import { Field } from "./Field";

interface DetailedYearsTableProps {
  detailed: DetailedInputs;
  setDetailed: (patch: Partial<DetailedInputs>) => void;
  setYear: (rok: number, patch: Partial<DetailedYearRow>) => void;
  fillAllYears: (vz: number) => void;
  pdfDropZone?: React.ReactNode;
}

const VARIANTA_LABELS: Record<Varianta, string> = {
  minimalisticka: "Minimalistická (2,5 %)",
  zakladni: "Základní (4 %)",
  stredni: "Střední (5 %)",
  optimisticka: "Optimistická (6 %)",
};

export function DetailedYearsTable({
  detailed,
  setDetailed,
  setYear,
  fillAllYears,
  pdfDropZone,
}: DetailedYearsTableProps) {
  const [showAllYears, setShowAllYears] = useState(false);
  const [fillValue, setFillValue] = useState(600_000);

  const totalVz = useMemo(
    () => detailed.rocniData.reduce((s, r) => s + r.vz, 0),
    [detailed.rocniData],
  );
  const filledYears = detailed.rocniData.filter((r) => r.vz > 0).length;
  const derivedGross = useMemo(
    () => effectiveGrossMonthly(detailed.rocniData),
    [detailed.rocniData],
  );

  const visibleRows = showAllYears
    ? detailed.rocniData
    : detailed.rocniData.filter((r) => r.rok >= 2010);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-3 border-b border-line">
        <h2 className="display text-xl text-ink">Detailní výpočet</h2>
        <span className="num text-xs text-muted">02</span>
      </header>

      <p className="text-sm text-ink/70 leading-relaxed">
        Vyplň roční vyměřovací základy (VZ) za roky{" "}
        <span className="num">1986+</span>. Najdeš je v dokumentu{" "}
        <a
          href="https://eportal.cssz.cz/web/portal/prehled-dob-duchodoveho-pojisteni"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted underline-offset-4 hover:text-ink"
        >
          „Přehled dob důchodového pojištění"
        </a>{" "}
        z eportál.cssz.cz nebo nahraj PDF níže.
      </p>

      {pdfDropZone && <div>{pdfDropZone}</div>}

      {/* Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Field label="Predikční varianta">
          <select
            className="input-base"
            value={detailed.varianta}
            onChange={(e) =>
              setDetailed({ varianta: e.target.value as Varianta })
            }
          >
            {(Object.keys(VARIANTA_LABELS) as Varianta[]).map((v) => (
              <option key={v} value={v}>
                {VARIANTA_LABELS[v]}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Počet vychovaných dětí"
          hint="Relevantní pro důchodový věk u žen narozených před 1971."
        >
          <input
            type="number"
            min={0}
            max={10}
            className="input-base num"
            value={detailed.pocetDeti}
            onChange={(e) =>
              setDetailed({ pocetDeti: Math.max(0, Number(e.target.value) || 0) })
            }
          />
        </Field>
        <Field
          label="Dny přesluhování"
          hint="Po dosažení důchodového věku, pokud klient odkládá odchod."
        >
          <input
            type="number"
            min={0}
            className="input-base num"
            value={detailed.dnyPresluhovani}
            onChange={(e) =>
              setDetailed({
                dnyPresluhovani: Math.max(0, Number(e.target.value) || 0),
              })
            }
          />
        </Field>
      </div>

      {/* Quick fill bar */}
      <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-line">
        <div className="flex-1 min-w-[200px]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted mb-1.5">
            Hromadné vyplnění
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={10000}
              className="input-base num"
              value={fillValue || ""}
              placeholder="VZ Kč/rok"
              onChange={(e) => setFillValue(Number(e.target.value) || 0)}
            />
            <button
              type="button"
              onClick={() => fillAllYears(fillValue)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-ink text-paper text-xs whitespace-nowrap"
              title="Vyplnit všechny roky stejnou hodnotou"
            >
              <Wand2 size={12} /> Vyplnit
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fillAllYears(0)}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs text-muted hover:text-ink border border-line border-dashed"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="text-xs text-muted flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>
          Vyplněno: <span className="num text-ink">{filledYears}</span> z{" "}
          <span className="num">{detailed.rocniData.length}</span> let
        </span>
        <span className="num">·</span>
        <span>
          Úhrn VZ: <span className="num text-ink">{formatCZK(totalVz)}</span>
        </span>
        {derivedGross > 0 && (
          <>
            <span className="num">·</span>
            <span>
              Aktuální hrubý příjem (z posledního VZ):{" "}
              <span className="num text-ink">{formatCZK(derivedGross)}</span>{" "}
              <span className="text-muted/80">/ měs</span>
            </span>
          </>
        )}
      </div>

      {/* Year table */}
      <div className="border border-line">
        <div className="grid grid-cols-[64px_1fr_120px] gap-2 px-3 py-2 bg-ink/5 border-b border-line text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Rok</span>
          <span>VZ Kč/rok</span>
          <span>Vyloučené dny</span>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {visibleRows.map((row) => (
            <YearRow
              key={row.rok}
              row={row}
              onChange={(patch) => setYear(row.rok, patch)}
            />
          ))}
        </div>
      </div>

      {!showAllYears && detailed.rocniData[0]?.rok < 2010 && (
        <button
          type="button"
          onClick={() => setShowAllYears(true)}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted hover:text-ink"
        >
          <ChevronDown size={14} />
          Zobrazit roky 1986–2009
        </button>
      )}
    </div>
  );
}

interface YearRowProps {
  row: DetailedYearRow;
  onChange: (patch: Partial<DetailedYearRow>) => void;
}

function YearRow({ row, onChange }: YearRowProps) {
  return (
    <div className="grid grid-cols-[64px_1fr_120px] gap-2 px-3 py-1.5 border-b border-line/40 hover:bg-ink/[0.02]">
      <span className="num text-sm text-muted self-center">{row.rok}</span>
      <input
        type="number"
        min={0}
        step={10000}
        className="input-base num text-sm py-1"
        value={row.vz || ""}
        placeholder="—"
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) => onChange({ vz: Math.max(0, Number(e.target.value) || 0) })}
      />
      <input
        type="number"
        min={0}
        max={366}
        className="input-base num text-sm py-1"
        value={row.vylouceneDny || ""}
        placeholder="0"
        onWheel={(e) => e.currentTarget.blur()}
        onChange={(e) =>
          onChange({
            vylouceneDny: Math.max(0, Math.min(366, Number(e.target.value) || 0)),
          })
        }
      />
    </div>
  );
}
