import { useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Wand2 } from "lucide-react";
import { formatCZK } from "../lib/format";
import type { Varianta } from "../lib/pension-detailed";
import type {
  DetailedInputs,
  DetailedYearRow,
} from "../state/useClientInputs";
import { Field } from "./Field";

/**
 * Inlined helper (not imported) — keeping this component on a pure-type
 * import from useClientInputs avoids dragging the hook (and its detailed
 * pension engine + adapter graph) into the main runtime chunk, which was
 * disrupting the pdfjs lazy chunk loading for IvkDropZone.
 */
function deriveGrossFromYears(rows: DetailedYearRow[]): number {
  if (!Array.isArray(rows)) return 0;
  const filled = rows.filter((r) => r && r.vz > 0);
  if (filled.length === 0) return 0;
  filled.sort((a, b) => b.rok - a.rok);
  return Math.round(filled[0].vz / 12);
}

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
  const chybejiciCount = detailed.rocniData.filter(
    (r) => r.chybi && r.vz === 0,
  ).length;
  const derivedGross = useMemo(
    () => deriveGrossFromYears(detailed.rocniData),
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
        <div className="grid grid-cols-[56px_1fr_96px_64px] gap-2 px-3 py-2 bg-ink/5 border-b border-line text-[10px] uppercase tracking-[0.18em] text-muted">
          <span>Rok</span>
          <span>VZ Kč/rok</span>
          <span>Vyl. dny</span>
          <span className="text-center" title="Chybějící doba pojištění">
            Chybí
          </span>
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

      {/* Doplnění chybějících dob — bod 3 */}
      <div className="border border-line bg-ink/[0.02] px-4 py-3 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={detailed.doplnitChybejici}
            onChange={(e) =>
              setDetailed({ doplnitChybejici: e.target.checked })
            }
          />
          <span className="text-sm text-ink/80 leading-relaxed">
            <span className="font-medium text-ink">
              Modelovat doplnění chybějících dob
            </span>
            <br />
            Roky zaškrtnuté ve sloupci „Chybí" (studium, mateřská, zahraničí…)
            se doplní průměrným VZ známých let. Ve výsledcích se ukáže důchod
            podle dostupných dat, po doplnění a rozdíl.
            {chybejiciCount > 0 && (
              <>
                {" "}
                Označeno{" "}
                <span className="num text-ink">{chybejiciCount}</span> let.
              </>
            )}
          </span>
        </label>
      </div>
    </div>
  );
}

interface YearRowProps {
  row: DetailedYearRow;
  onChange: (patch: Partial<DetailedYearRow>) => void;
}

function YearRow({ row, onChange }: YearRowProps) {
  const hasVz = row.vz > 0;
  return (
    <div className="grid grid-cols-[56px_1fr_96px_64px] gap-2 px-3 py-1.5 border-b border-line/40 hover:bg-ink/[0.02]">
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
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={!hasVz && !!row.chybi}
          disabled={hasVz}
          title={
            hasVz
              ? "Rok má vyplněný VZ — není chybějící"
              : "Označit jako chybějící dobu pojištění"
          }
          onChange={(e) => onChange({ chybi: e.target.checked })}
        />
      </div>
    </div>
  );
}
