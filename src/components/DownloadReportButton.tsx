import { useState } from "react";
import { Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import type { ScenarioResult } from "../lib/pension";
import type { Allocation, PortfolioMetrics } from "../lib/portfolio";
import type { ClientInputs } from "../state/useClientInputs";
import { ClientReport } from "./pdf/ClientReport";

interface DownloadReportButtonProps {
  result: ScenarioResult;
  inputs: ClientInputs;
  allocation: Allocation;
  portfolioMetrics: PortfolioMetrics;
  variant?: "primary" | "ghost";
  label?: string;
}

export function DownloadReportButton({
  result,
  inputs,
  allocation,
  portfolioMetrics,
  variant = "primary",
  label = "Stáhnout report (PDF)",
}: DownloadReportButtonProps) {
  const [state, setState] = useState<"idle" | "generating" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleDownload() {
    setState("generating");
    setErrorMsg(null);
    try {
      const doc = (
        <ClientReport
          result={result}
          inputs={inputs}
          allocation={allocation}
          portfolioMetrics={portfolioMetrics}
        />
      );
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `duchod-report-${(inputs.clientName || "klient")
        .replace(/\s+/g, "-")
        .toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Defer revoke so the download has time to start
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setState("idle");
    } catch (err) {
      console.error("[PDF] generation failed:", err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setState("error");
    }
  }

  const baseClasses =
    "group inline-flex items-center gap-2 px-5 py-3 text-sm tracking-wide transition-all hover:gap-3 disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-ink text-paper hover:bg-ink/90"
      : "border border-line text-ink hover:border-ink";

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={state === "generating"}
        className={`${baseClasses} ${styles}`}
      >
        <Download size={14} />
        <span>{state === "generating" ? "Generuji…" : label}</span>
      </button>
      {state === "error" && errorMsg && (
        <p className="text-xs text-accent max-w-xs text-right">
          Generování PDF selhalo: {errorMsg}
        </p>
      )}
    </div>
  );
}
