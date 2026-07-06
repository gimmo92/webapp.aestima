"use client";

import { useState } from "react";
import { QuoteSheet } from "./QuoteSheet";
import type { AnalysisResult, Quote } from "@/lib/types";

// STEP 4 — Preventivo generato su "carta intestata" simulata.

interface Props {
  quote: Quote;
  analysis: AnalysisResult;
  onRestart: () => void;
  onBack: () => void;
}

export function QuoteDocument({ quote, analysis, onRestart, onBack }: Props) {
  const [approved, setApproved] = useState(false);

  // "Esporta PDF": usa il dialog di stampa del browser (Salva come PDF).
  // Il CSS @media print mostra solo il documento #quote-printable.
  const exportPdf = () => window.print();

  return (
    <section className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Passo 4 — Preventivo pronto
          </div>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">
            Bozza di offerta, pronta per la tua revisione
          </h2>
        </div>
      </div>

      {approved && (
        <div className="flex items-center gap-2.5 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 10.5 8 14.5 16 5.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Preventivo approvato dal tecnico — pronto per l&apos;invio al cliente.
        </div>
      )}

      {/* ---- Documento su carta intestata ---- */}
      <QuoteSheet quote={quote} serial={analysis.numero_serie} />

      {/* ---- Azioni (nascoste in stampa) ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Indietro
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={exportPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Esporta PDF
          </button>

          <button
            onClick={() => setApproved(true)}
            disabled={approved}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ok px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ok/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 10.5 8 14.5 16 5.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {approved ? "Approvato" : "Approva"}
          </button>
        </div>
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={onRestart}
          className="text-sm text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Nuova richiesta
        </button>
      </div>
    </section>
  );
}
