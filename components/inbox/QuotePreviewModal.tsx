"use client";

import { useState, useEffect, useRef } from "react";
import { QuoteSheet } from "@/components/QuoteSheet";
import type { Quote } from "@/lib/types";

// Anteprima a schermo del preventivo PDF allegato alla mail di risposta.
// - "Scarica PDF" usa il dialog di stampa del browser (Salva come PDF):
//   le regole @media print in globals.css stampano solo #quote-printable.
// - Pannello laterale "Modifica con AI": l'operatore descrive la modifica
//   in linguaggio naturale e Claude aggiorna il preventivo (fallback
//   locale se la API key non è configurata).

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

type EditSource = "anthropic" | "mock";
type MockReason = "missing_api_key" | "api_error" | "parse_error";

function mockBadgeLabel(reason?: MockReason, detail?: string): string {
  if (reason === "missing_api_key") {
    return "Modifica locale — imposta ANTHROPIC_API_KEY (o anthropic) su Vercel";
  }
  if (reason === "api_error") {
    return detail
      ? `Modifica locale — Claude non disponibile (${detail})`
      : "Modifica locale — Claude non disponibile, uso regole demo";
  }
  if (reason === "parse_error") {
    return "Modifica locale — risposta Claude non valida, uso regole demo";
  }
  return "Modifica locale (demo)";
}

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
  const [source, setSource] = useState<EditSource | null>(null);
  const [mockReason, setMockReason] = useState<MockReason | undefined>();
  const [mockDetail, setMockDetail] = useState<string | undefined>();
  const [displayQuote, setDisplayQuote] = useState(quote);
  const displayQuoteRef = useRef(quote);

  useEffect(() => {
    setDisplayQuote(quote);
    displayQuoteRef.current = quote;
  }, [quote]);

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
        body: JSON.stringify({
          quote: displayQuoteRef.current,
          instruction: trimmed,
        }),
      });
      const data = res.ok ? await res.json() : null;
      if (data?.quote) {
        const next = data.quote as Quote;
        displayQuoteRef.current = next;
        setDisplayQuote(next);
        onQuoteChange?.(next);
        setSource(data.source === "anthropic" ? "anthropic" : "mock");
        setMockReason(data.reason as MockReason | undefined);
        setMockDetail(
          typeof data.detail === "string" ? data.detail : undefined
        );
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
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-base/95 px-4 py-3 print:hidden">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-brand">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          <span className="truncate font-medium text-ink">
            Preventivo_{displayQuote.number}.pdf
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

      {/* Corpo: documento a sinistra, pannello AI a destra */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Documento */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mx-auto w-full max-w-3xl">
            <QuoteSheet quote={displayQuote} customerName={customerName} serial={serial} />
          </div>
        </div>

        {/* Pannello "Modifica con AI" (nascosto in stampa) */}
        <aside className="flex shrink-0 flex-col border-t border-border bg-base/95 lg:w-96 lg:border-l lg:border-t-0 print:hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-brand">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.9L12 15l-1.9-4.1L5.5 9l4.6-1.4L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M18 15.5 18.7 17l1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5Z" fill="currentColor" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Modifica con AI</p>
              <p className="text-[11px] text-ink-faint">
                Descrivi la modifica, ci pensa l&apos;agente
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            <p className="text-xs leading-relaxed text-ink-muted">
              Scrivi in linguaggio naturale come vuoi cambiare il preventivo:
              sconti, righe aggiuntive, quantità, prezzi, urgenza. I totali si
              ricalcolano automaticamente.
            </p>

            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Suggerimenti
              </p>
              <div className="flex flex-wrap gap-1.5">
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
              </div>
            </div>

            {source && !busy && (
              <span
                className={[
                  "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  source === "anthropic"
                    ? "bg-brand/15 text-brand"
                    : "border border-border bg-surface-2 text-ink-muted",
                ].join(" ")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {source === "anthropic"
                  ? "Modificato con Claude"
                  : mockBadgeLabel(mockReason, mockDetail)}
              </span>
            )}

            {error && <p className="text-xs text-warn">{error}</p>}
          </div>

          {/* Casella di testo + invio (in fondo al pannello) */}
          <div className="border-t border-border p-3">
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  applyEdit(instruction);
                }
              }}
              disabled={busy}
              rows={3}
              placeholder="Es. “applica 10% di sconto e aggiungi trasporto 50€”"
              className="w-full resize-none rounded-lg border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
            />
            <button
              onClick={() => applyEdit(instruction)}
              disabled={busy || !instruction.trim()}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Applico…
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                  Applica modifica
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
