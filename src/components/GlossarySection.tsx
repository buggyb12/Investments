import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { GLOSSARY } from "../lib/glossary";

/**
 * Rozbalovací slovník důchodových pojmů pro klienta. Obsah sdílí s PDF
 * reportem (src/lib/glossary.ts).
 */
export function GlossarySection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="pt-8 border-t border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted hover:text-ink transition-colors"
      >
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span>{open ? "Skrýt" : "Zobrazit"} slovník pojmů</span>
      </button>

      {open && (
        <dl className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4">
          {GLOSSARY.map((item) => (
            <div key={item.term} className="border-l-2 border-line pl-3">
              <dt className="text-sm font-medium text-ink mb-0.5">
                {item.term}
              </dt>
              <dd className="text-xs text-ink/70 leading-relaxed">
                {item.definition}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
