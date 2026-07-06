"use client";

import { useEffect } from "react";
import { QuoteSheet } from "@/components/QuoteSheet";
import type { Quote } from "@/lib/types";

// Anteprima a schermo del preventivo PDF allegato alla mail di risposta.
// "Scarica PDF" usa il dialog di stampa del browser (Salva come PDF):
// le regole @media print in globals.css stampano solo #quote-printable.

interface Props {
  quote: Quote;
  customerName?: string;
  serial?: string;
  onClose: () => void;
}

export function QuotePreviewModal({ quote, customerName, serial, onClose }: Props) {
  // Chiusura con Esc + blocco dello scroll di fondo.
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm print:bg-white"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Barra azioni (nascosta in stampa) */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-base/95 px-4 py-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-brand">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          <span className="truncate font-medium text-ink">
            Preventivo_{quote.number}.pdf
          </span>
          <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            Anteprima
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Scarica PDF
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

      {/* Documento */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="mx-auto w-full max-w-3xl">
          <QuoteSheet quote={quote} customerName={customerName} serial={serial} />
        </div>
      </div>
    </div>
  );
}
