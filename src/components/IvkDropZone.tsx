import { useCallback, useRef, useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import { parseIvkOnServer } from "../lib/pension-detailed/ivk-parser";

interface IvkDropZoneProps {
  onYearsParsed: (rows: Array<{ rok: number; vz: number; vylouceneDny: number }>) => void;
}

export function IvkDropZone({ onYearsParsed }: IvkDropZoneProps) {
  const [state, setState] = useState<"idle" | "parsing" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ jmeno?: string; rc?: string; rows?: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setError("Soubor musí být PDF.");
        setState("error");
        return;
      }
      setState("parsing");
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        const result = await parseIvkOnServer(buffer);
        if (result.rows.length === 0) {
          setError(
            "Z PDF se nepodařilo vyčíst žádné roky. Vlož data ručně, nebo zkus jiný IVK PDF.",
          );
          setState("error");
          return;
        }
        onYearsParsed(result.rows);
        setMeta({
          jmeno: result.jmeno,
          rc: result.rc,
          rows: result.rows.length,
        });
        setState("ok");
      } catch (err) {
        console.error("[IVK] parse failed:", err);
        setError(err instanceof Error ? err.message : String(err));
        setState("error");
      }
    },
    [onYearsParsed],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`relative border-2 border-dashed p-5 transition-colors ${
        state === "ok"
          ? "border-secondary/40 bg-secondary/5"
          : state === "error"
            ? "border-accent/40 bg-accent/5"
            : "border-line hover:border-ink/40"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      {state === "ok" && meta ? (
        <div className="flex items-start gap-3">
          <FileText size={18} className="text-secondary mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-ink">
              {meta.jmeno || "Pojištěnec"}
              {meta.rc && (
                <span className="num text-muted ml-2 text-xs">{meta.rc}</span>
              )}
            </p>
            <p className="text-xs text-muted mt-0.5">
              Naparsováno {meta.rows} let. Tabulka níže je předvyplněná, můžeš upravit.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setState("idle");
              setMeta(null);
            }}
            className="text-muted hover:text-ink"
            aria-label="Zavřít"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={state === "parsing"}
          className="w-full flex items-center justify-center gap-3 text-left disabled:opacity-50"
        >
          <Upload size={16} className="text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">
              {state === "parsing"
                ? "Parsuju PDF…"
                : "Přetáhni IVK PDF, nebo klikni"}
            </p>
            <p className="text-xs text-muted mt-0.5">
              Soubor „Přehled dob důchodového pojištění" z eportál.cssz.cz
            </p>
          </div>
        </button>
      )}

      {state === "error" && error && (
        <p className="mt-3 text-xs text-accent">{error}</p>
      )}
    </div>
  );
}
