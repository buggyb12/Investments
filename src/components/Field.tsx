import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  hint?: string;
  htmlFor?: string;
  trailing?: ReactNode;
  children: ReactNode;
}

export function Field({ label, hint, htmlFor, trailing, children }: FieldProps) {
  return (
    <label htmlFor={htmlFor} className="block group">
      <div className="flex items-baseline justify-between gap-3 mb-1.5">
        <span className="text-[11px] uppercase tracking-[0.18em] text-muted font-medium">
          {label}
        </span>
        {trailing}
      </div>
      {children}
      {hint && (
        <p className="mt-1.5 text-xs text-muted leading-relaxed">{hint}</p>
      )}
    </label>
  );
}
