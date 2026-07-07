"use client";

import { useEffect, useState } from "react";
import { InterventionReportSheet } from "./InterventionReportSheet";
import {
  buildInterventionReportPdf,
  downloadPdfBytes,
  interventionReportPdfFilename,
} from "@/lib/interventionReportPdf";
import type { InterventionReport } from "@/lib/technicianTypes";

interface Props {
  report: InterventionReport;
  technicianName: string;
  onClose: () => void;
}

export function InterventionReportPdfModal({ report, technicianName, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filename = interventionReportPdfFilename(report);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const downloadEditablePdf = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const bytes = await buildInterventionReportPdf(report, technicianName);
      downloadPdfBytes(bytes, filename);
    } catch {
      setError("Impossibile generare il PDF. Riprova.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm print:bg-white"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-base/95 px-4 py-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-brand">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          <span className="truncate font-medium text-ink">{filename}</span>
          <span className="shrink-0 rounded-full border border-brand/40 bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
            PDF editabile
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => void downloadEditablePdf()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {busy ? "Generazione…" : "Scarica PDF editabile"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            Stampa
          </button>
          <button
            onClick={onClose}
            aria-label="Chiudi anteprima"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 border-b border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger print:hidden">
          {error}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
        <div className="mx-auto max-w-3xl print:max-w-none">
          <InterventionReportSheet report={report} technicianName={technicianName} />
        </div>
      </div>

      <p className="shrink-0 border-t border-border bg-base/95 px-4 py-2 text-center text-[11px] text-ink-faint print:hidden">
        Il PDF editabile include campi compilabili (sintesi, lavori, ricambi, note e firme) apribili in Acrobat o Foxit.
      </p>
    </div>
  );
}
