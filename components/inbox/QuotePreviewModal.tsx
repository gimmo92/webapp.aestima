"use client";

import { useState, useEffect } from "react";
import { QuoteSheet } from "@/components/QuoteSheet";
import type { Quote } from "@/lib/types";

// Anteprima a schermo del preventivo PDF allegato alla mail di risposta.
// - "Scarica PDF" usa il dialog di stampa del browser (Salva come PDF):
//   le regole @media print in globals.css stampano solo #quote-printable.
// - Casella "Modifica con AI": l'operatore descrive la modifica in
//   linguaggio naturale e Claude aggiorna il preventivo (fallback locale
//   se la API key non è configurata).

interface Props {
  quote: Quote;
  customerName?: string;
  serial?: string;
  onClose: () => void;
  /** Aggiorna il preventivo dopo una modifica via AI. */
  onQuoteChange?: (q: Quote) => void;
}

const SUGGESTIONS = [
  "Applica 10% di sconto",
  "Aggiungi trasporto 50€",
  "Quantità 2",
  "Togli la maggiorazione urgenza",
];

export function QuotePreviewModal({
  quote,
  customerName,
  serial,
  onClose,
  onQuoteChange,
}: Props) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<"anthropic" | "mock" | null>(null);

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

  const applyEdit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quote-edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ quote, instruction: trimmed }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.quote) {
        onQuoteChange?.(data.quote as Quote);
        setSource(data.source === "anthropic" ? "anthropic" : "mock");
        setInstruction("");
      } else {
        setError("Non sono riuscito ad applicare la modifica. Riprova.");
      }
    } catch {
      setError("Errore di rete durante la modifica. Riprova.");
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
      {/* Barra azioni (nascosta in stampa) */}
      <div className="shrink-0 border-b border-border bg-base/95 print:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
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

        {/* Modifica con AI */}
        <div className="border-t border-border/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M18 15.5 18.7 17l1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5Z" fill="currentColor" />
                </svg>
              </span>
              <input
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    applyEdit(instruction);
                  }
                }}
                disabled={busy}
                placeholder="Modifica il preventivo con l'AI — es. “applica 10% di sconto”, “aggiungi trasporto 50€”"
                className="w-full rounded-lg border border-border bg-base py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
              />
            </div>
            <button
              onClick={() => applyEdit(instruction)}
              disabled={busy || !instruction.trim()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/50 bg-brand-soft px-3.5 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
                  Applico…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                  Applica
                </>
              )}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => applyEdit(s)}
                disabled={busy}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-ink-muted transition-colors hover:border-brand/50 hover:text-ink disabled:opacity-50"
              >
                {s}
              </button>
            ))}
            {source && !busy && (
              <span
                className={[
                  "ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  source === "anthropic"
                    ? "bg-brand/15 text-brand"
                    : "border border-border bg-surface-2 text-ink-muted",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {source === "anthropic" ? "Modificato con Claude" : "Modifica locale (demo)"}
              </span>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-warn">{error}</p>}
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
