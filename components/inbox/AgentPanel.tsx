"use client";

import { useEffect, useState } from "react";
import { matchAnalysisToData } from "@/lib/match";
import { mockAnalyze } from "@/lib/mockAnalyze";
import { buildQuote, euro } from "@/lib/quote";
import { buildCustomerReply, buildSupplierRequest } from "@/lib/inboxDrafts";
import type { AnalysisResult, MatchResult, Quote } from "@/lib/types";
import type { PartRequest } from "@/lib/inboxTypes";

// Pannello "Analisi aestima": esegue l'analisi della richiesta (via API
// Anthropic con fallback mock), identifica il ricambio e prepara le bozze.

interface Props {
  request: PartRequest;
  /** L'operatore approva e invia: rappresenta l'azione umana. */
  onApproveSend: () => void;
}

export function AgentPanel({ request, onApproveSend }: Props) {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sent, setSent] = useState(false);

  // Ri-analizza ogni volta che cambia la richiesta selezionata.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSent(false);
    setAnalysis(null);
    setMatch(null);
    setQuote(null);

    (async () => {
      let result: AnalysisResult;
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ request: request.body }),
          signal: controller.signal,
        });
        result = res.ok ? await res.json() : mockAnalyze(request.body);
      } catch {
        if (controller.signal.aborted) return;
        result = mockAnalyze(request.body);
      }
      if (controller.signal.aborted) return;

      const m = matchAnalysisToData(result);
      setAnalysis(result);
      setMatch(m);
      if (m.machine && m.component) {
        setQuote(buildQuote(m.machine, m.component, result));
      }
      setLoading(false);
    })();

    return () => controller.abort();
  }, [request.id, request.body]);

  const missingPart = match?.availability === "da_ordinare";
  const identified = Boolean(match?.machine && match?.component && quote);

  return (
    <div className="mt-5">
      {/* Intestazione sezione */}
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
            <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 3v2m0 14v2m9-9h-2M5 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <h3 className="text-sm font-semibold text-ink">Analisi aestima</h3>
        {analysis && <SourceBadge source={analysis.source} />}
      </div>

      {loading ? (
        <LoadingCard />
      ) : (
        <div className="space-y-4">
          {/* Card ricambio identificato */}
          <div className="rounded-xl border border-border bg-base/60 p-4">
            {identified && match?.machine && match?.component && quote ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Macchina">
                    <p className="font-medium text-ink">{match.machine.model}</p>
                    <p className="text-xs text-ink-faint">
                      Matr. {match.machine.serial} · {match.machine.year}
                    </p>
                  </Field>
                  <Field label="Urgenza">
                    <UrgencyTag urgency={analysis!.urgenza} />
                  </Field>
                  <Field label="Componente">
                    <p className="font-medium text-ink">
                      {match.component.description}
                    </p>
                    <p className="font-mono text-xs text-brand">
                      {match.component.code}
                    </p>
                  </Field>
                  <Field label="Prezzo di listino">
                    <p className="font-medium text-ink">
                      {euro(match.component.listPrice)}
                    </p>
                    <p className="text-xs text-ink-faint">
                      Totale offerta {euro(quote.total)} (IVA incl.)
                    </p>
                  </Field>
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <Availability quote={quote} />
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2 text-sm text-ink-muted">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-warn">
                  <path d="M12 8v5m0 3h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="font-medium text-ink">
                    Serve una verifica del tecnico
                  </p>
                  <p className="text-xs">
                    L&apos;agente ha letto “{analysis?.componente_identificato}”
                    {analysis?.numero_serie
                      ? ` per la matricola ${analysis.numero_serie}`
                      : " ma non ha trovato una matricola valida"}
                    . Identifica manualmente il ricambio nella distinta.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bozza richiesta fornitore (se pezzo mancante) */}
          {identified && missingPart && match?.machine && match?.component && (
            <DraftBox
              tone="warn"
              icon="supplier"
              title="Bozza richiesta fornitore pronta"
              badge="Pezzo mancante"
              text={buildSupplierRequest(match.machine, match.component)}
            />
          )}

          {/* Bozza risposta cliente */}
          {identified && match?.machine && match?.component && quote && (
            <DraftBox
              tone="brand"
              icon="reply"
              title="Bozza di risposta al cliente"
              badge={sent ? "Inviata" : "Da approvare"}
              text={buildCustomerReply(
                request,
                match.machine,
                match.component,
                quote
              )}
              footer={
                <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-ink-faint">
                    Nulla parte in automatico. aestima prepara,{" "}
                    <span className="text-ink-muted">
                      l&apos;operatore approva e invia.
                    </span>
                  </p>
                  <button
                    onClick={() => {
                      setSent(true);
                      onApproveSend();
                    }}
                    disabled={sent}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-ok disabled:opacity-90"
                  >
                    {sent ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Inviata al cliente
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="m4 12 15-8-6 16-3-6-6-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                        </svg>
                        Approva e invia
                      </>
                    )}
                  </button>
                </div>
              }
            />
          )}
        </div>
      )}
    </div>
  );
}

// ---- sotto-componenti ----

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      {children}
    </div>
  );
}

function Availability({ quote }: { quote: Quote }) {
  if (quote.availability === "disponibile") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ok">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        Disponibile a magazzino — pronto alla spedizione
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-warn">
      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
      Da ordinare — consegna stimata in {quote.leadTimeDays} gg lavorativi
    </span>
  );
}

function UrgencyTag({ urgency }: { urgency: AnalysisResult["urgenza"] }) {
  const map = {
    alta: { c: "#ef4444", t: "Alta" },
    normale: { c: "#9fb0c3", t: "Normale" },
    bassa: { c: "#6b7d92", t: "Bassa" },
  } as const;
  const { c, t } = map[urgency];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: c, backgroundColor: `${c}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
      {t}
    </span>
  );
}

function SourceBadge({ source }: { source: AnalysisResult["source"] }) {
  const isAI = source === "anthropic";
  return (
    <span
      className={[
        "ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isAI ? "bg-brand/15 text-brand" : "border border-border bg-surface-2 text-ink-muted",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {isAI ? "Claude" : "Demo locale"}
    </span>
  );
}

function DraftBox({
  tone,
  icon,
  title,
  badge,
  text,
  footer,
}: {
  tone: "brand" | "warn";
  icon: "reply" | "supplier";
  title: string;
  badge: string;
  text: string;
  footer?: React.ReactNode;
}) {
  const accent = tone === "brand" ? "#3b82f6" : "#f97316";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-base/60">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: accent }}>
            {icon === "reply" ? (
              <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M3 9h18M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3m-1 0v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          {title}
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: accent, backgroundColor: `${accent}1f` }}
        >
          {badge}
        </span>
      </div>
      <div className="p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-muted">
          {text}
        </pre>
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-xl border border-border bg-base/60 p-4">
      <div className="flex items-center gap-3 text-sm text-ink-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
        L&apos;agente sta analizzando la richiesta…
      </div>
      <div className="mt-4 space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-3 rounded bg-surface-2/70" style={{ width: `${80 - i * 15}%` }} />
        ))}
      </div>
    </div>
  );
}
