"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { matchAnalysisToData } from "@/lib/match";
import { mockAnalyze } from "@/lib/mockAnalyze";
import { buildQuote, euro } from "@/lib/quote";
import {
  buildCustomerReply,
  buildInfoRequestReply,
  buildSupplierRequest,
  buildSupplierSubject,
  buildTechnicianAvailabilityRequest,
  buildTechnicianSubject,
} from "@/lib/inboxDrafts";
import { docsForMachine } from "@/lib/archiveData";
import { capabilitiesForMachineCategory } from "@/lib/technicianData";
import { DocTypeBadge } from "@/components/archive/DocTypeBadge";
import { QuotePreviewModal } from "./QuotePreviewModal";
import { SupplierPickerModal } from "@/components/suppliers/SupplierPickerModal";
import { TechnicianPickerModal } from "@/components/technicians/TechnicianPickerModal";
import { useInbox } from "./InboxProvider";
import type { AnalysisResult, MatchResult, Quote } from "@/lib/types";
import type { PartRequest } from "@/lib/inboxTypes";

// Pannello "Analisi aestima": esegue l'analisi della richiesta (via API
// Anthropic con fallback mock), identifica il ricambio e prepara le bozze.
// Le bozze (mail al cliente e richiesta fornitore) sono MODIFICABILI
// dall'operatore prima dell'invio.

interface Props {
  request: PartRequest;
  /** Azione dell'operatore: approva la bozza e la invia al cliente. */
  onApproveSend: () => void;
}

export function AgentPanel({ request, onApproveSend }: Props) {
  const {
    createSupplierRequests,
    createTechnicianAssignment,
    getTechnicianAssignmentForRequest,
  } = useInbox();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [sent, setSent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);
  const [showTechnicianPicker, setShowTechnicianPicker] = useState(false);
  const [supplierSent, setSupplierSent] = useState(false);
  const [technicianAssigned, setTechnicianAssigned] = useState(false);
  const [infoSent, setInfoSent] = useState(false);

  // Testo modificabile delle bozze (lo stato di editing vive qui).
  const [replyText, setReplyText] = useState("");
  const [supplierText, setSupplierText] = useState("");
  const [technicianText, setTechnicianText] = useState("");
  const [infoReplyText, setInfoReplyText] = useState("");

  // Ri-analizza ogni volta che cambia la richiesta selezionata.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSent(false);
    setShowPreview(false);
    setShowSupplierPicker(false);
    setShowTechnicianPicker(false);
    setSupplierSent(false);
    setTechnicianAssigned(false);
    setInfoSent(false);
    setAnalysis(null);
    setMatch(null);
    setQuote(null);
    setReplyText("");
    setSupplierText("");
    setTechnicianText("");
    setInfoReplyText("");

    const existingAssignment = getTechnicianAssignmentForRequest(request.id);
    setTechnicianAssigned(!!existingAssignment);

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

      // Prepara le bozze iniziali (poi l'operatore può modificarle).
      if (m.machine && m.component) {
        const q = buildQuote(m.machine, m.component, result);
        setQuote(q);
        setReplyText(buildCustomerReply(request, m.machine, m.component, q));
        setSupplierText(
          q.availability === "da_ordinare"
            ? buildSupplierRequest(m.machine, m.component)
            : ""
        );
        setTechnicianText(
          buildTechnicianAvailabilityRequest(request, {
            machineModel: m.machine.model,
            machineSerial: m.machine.serial,
            componentCode: m.component.code,
            componentDescription: m.component.description,
            urgency: result.urgenza,
          })
        );
      } else {
        setInfoReplyText(buildInfoRequestReply(request, result, m.machine));
        setTechnicianText(
          buildTechnicianAvailabilityRequest(request, {
            machineModel: m.machine?.model,
            machineSerial: m.machine?.serial ?? result.numero_serie ?? undefined,
            urgency: result.urgenza,
          })
        );
      }
      setLoading(false);
    })();

    return () => controller.abort();
    // Volutamente dipende solo da id/body: NON vogliamo ri-analizzare
    // (né richiamare l'API) quando cambiano stato o etichette della richiesta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.id, request.body]);

  // Ripristina la bozza originale generata da aestima.
  const resetReply = () => {
    if (match?.machine && match?.component && quote) {
      setReplyText(buildCustomerReply(request, match.machine, match.component, quote));
    }
  };
  const resetSupplier = () => {
    if (match?.machine && match?.component) {
      setSupplierText(buildSupplierRequest(match.machine, match.component));
    }
  };
  const resetTechnician = () => {
    setTechnicianText(
      buildTechnicianAvailabilityRequest(request, {
        machineModel: match?.machine?.model,
        machineSerial: match?.machine?.serial ?? analysis?.numero_serie ?? undefined,
        componentCode: match?.component?.code,
        componentDescription: match?.component?.description,
        urgency: analysis?.urgenza,
      })
    );
  };
  const resetInfoReply = () => {
    if (analysis) {
      setInfoReplyText(
        buildInfoRequestReply(request, analysis, match?.machine ?? null)
      );
    }
  };

  const missingPart = match?.availability === "da_ordinare";
  const identified = Boolean(match?.machine && match?.component && quote);
  const needsMoreInfo = Boolean(analysis && !identified);
  const suggestedCapabilities = match?.machine
    ? capabilitiesForMachineCategory(match.machine.category)
    : [];
  const technicianSubject = buildTechnicianSubject(
    request,
    match?.component?.code
  );

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
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-brand">
                  <path d="M12 16v-4m0-4h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
                <div>
                  <p className="font-medium text-ink">Servono più informazioni</p>
                  <p className="text-xs">
                    Non abbiamo ancora individuato il ricambio con certezza
                    {analysis?.numero_serie
                      ? ` (matricola ${analysis.numero_serie})`
                      : ""}
                    . Abbiamo preparato una bozza per chiedere al cliente i dettagli mancanti.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bozza richiesta info al cliente (ricambio non identificato) */}
          {needsMoreInfo && (
            <DraftBox
              tone="brand"
              icon="reply"
              title="Bozza di richiesta informazioni al cliente"
              badge={infoSent ? "Inviata" : "Da approvare"}
              value={infoReplyText}
              onChange={setInfoReplyText}
              onReset={resetInfoReply}
              readOnly={infoSent}
              footer={
                <div className="flex border-t border-border pt-3 sm:justify-end">
                  <button
                    onClick={() => setInfoSent(true)}
                    disabled={infoSent || !infoReplyText.trim()}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-ok disabled:opacity-90"
                  >
                    {infoSent ? (
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

          {/* Documenti collegati in archivio (riferimenti cliccabili) */}
          {identified && match?.machine && (
            <ArchiveLinks serial={match.machine.serial} />
          )}

          {/* Assegna intervento tecnico */}
          {!loading && (
            <DraftBox
              tone="brand"
              icon="technician"
              title="Assegna intervento a tecnico"
              badge={technicianAssigned ? "Assegnato" : "Disponibilità"}
              value={technicianText}
              onChange={setTechnicianText}
              onReset={resetTechnician}
              readOnly={technicianAssigned}
              footer={
                <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                  {technicianAssigned ? (
                    <p className="flex items-center gap-1.5 text-xs text-ok">
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Tecnico assegnato.{" "}
                      <Link href="/tecnici" className="font-medium text-brand hover:underline">
                        Vedi in Tecnici →
                      </Link>
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-ink-faint">
                        Contatta il tecnico via WhatsApp o email con messaggio precompilato.
                      </p>
                      <button
                        onClick={() => setShowTechnicianPicker(true)}
                        disabled={!technicianText.trim()}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-brand/40 bg-brand-soft px-4 py-2.5 text-sm font-semibold text-brand transition-colors hover:bg-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                        </svg>
                        Seleziona tecnico
                      </button>
                    </>
                  )}
                </div>
              }
            />
          )}

          {/* Bozza richiesta fornitore (se pezzo mancante) — modificabile */}
          {identified && missingPart && (
            <DraftBox
              tone="warn"
              icon="supplier"
              title="Bozza richiesta fornitore"
              badge={supplierSent ? "Inviata" : "Pezzo mancante"}
              value={supplierText}
              onChange={setSupplierText}
              onReset={resetSupplier}
              readOnly={supplierSent}
              footer={
                <div className="flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
                  {supplierSent ? (
                    <p className="flex items-center gap-1.5 text-xs text-ok">
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Richiesta inviata ai fornitori selezionati.{" "}
                      <Link href="/fornitori" className="font-medium text-brand hover:underline">
                        Vedi in Fornitori →
                      </Link>
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-ink-faint">
                        Il pezzo non è a magazzino: invia la richiesta ai fornitori della rubrica.
                      </p>
                      <button
                        onClick={() => setShowSupplierPicker(true)}
                        disabled={!supplierText.trim()}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-warn/50 bg-warn/10 px-4 py-2.5 text-sm font-semibold text-warn transition-colors hover:bg-warn/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M3 9h18M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3m-1 0v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Seleziona fornitori e invia
                      </button>
                    </>
                  )}
                </div>
              }
            />
          )}

          {/* Bozza risposta cliente — modificabile */}
          {identified && (
            <DraftBox
              tone="brand"
              icon="reply"
              title="Bozza di risposta al cliente"
              badge={sent ? "Inviata" : "Da approvare"}
              value={replyText}
              onChange={setReplyText}
              onReset={resetReply}
              readOnly={sent}
              attachment={
                quote && (
                  <QuoteAttachment
                    quote={quote}
                    onView={() => setShowPreview(true)}
                  />
                )
              }
              footer={
                <div className="flex border-t border-border pt-3 sm:justify-end">
                  <button
                    onClick={() => {
                      setSent(true);
                      onApproveSend();
                    }}
                    disabled={sent || !replyText.trim()}
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

      {/* Anteprima del PDF del preventivo allegato alla mail */}
      {showPreview && quote && (
        <QuotePreviewModal
          quote={quote}
          customerName={request.company}
          serial={match?.machine?.serial}
          onClose={() => setShowPreview(false)}
          onQuoteChange={setQuote}
        />
      )}

      {showSupplierPicker && match?.machine && match?.component && (
        <SupplierPickerModal
          subject={buildSupplierSubject(match.component)}
          body={supplierText}
          onClose={() => setShowSupplierPicker(false)}
          onSend={(supplierIds) => {
            createSupplierRequests({
              partRequestId: request.id,
              supplierIds,
              subject: buildSupplierSubject(match.component!),
              body: supplierText,
              componentCode: match.component!.code,
              componentDescription: match.component!.description,
              machineModel: match.machine!.model,
              machineSerial: match.machine!.serial,
            });
            setSupplierSent(true);
            setShowSupplierPicker(false);
          }}
        />
      )}

      {showTechnicianPicker && (
        <TechnicianPickerModal
          request={request}
          subject={technicianSubject}
          body={technicianText}
          suggestedCapabilityIds={suggestedCapabilities}
          machineModel={match?.machine?.model}
          machineSerial={match?.machine?.serial ?? analysis?.numero_serie ?? undefined}
          componentCode={match?.component?.code}
          componentDescription={match?.component?.description}
          onClose={() => setShowTechnicianPicker(false)}
          onAssign={(technicianId, contacted) => {
            createTechnicianAssignment({
              partRequestId: request.id,
              technicianId,
              subject: technicianSubject,
              body: technicianText,
              machineModel: match?.machine?.model,
              machineSerial: match?.machine?.serial ?? analysis?.numero_serie ?? undefined,
              componentCode: match?.component?.code,
              componentDescription: match?.component?.description,
              contacted,
            });
            setTechnicianAssigned(true);
            setShowTechnicianPicker(false);
          }}
        />
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

/** Riquadro bozza con textarea modificabile (auto-resize) e ripristino. */
function DraftBox({
  tone,
  icon,
  title,
  badge,
  value,
  onChange,
  onReset,
  readOnly = false,
  attachment,
  footer,
}: {
  tone: "brand" | "warn";
  icon: "reply" | "supplier" | "technician";
  title: string;
  badge: string;
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  readOnly?: boolean;
  attachment?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const accent = tone === "brand" ? "#3b82f6" : "#f97316";
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-base/60">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: accent }}>
            {icon === "reply" ? (
              <path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 6 6v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            ) : icon === "supplier" ? (
              <path d="M3 9h18M6 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3m-1 0v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            )}
          </svg>
          {title}
        </div>
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              onClick={onReset}
              className="inline-flex items-center gap-1 text-xs text-ink-faint transition-colors hover:text-ink"
              title="Ripristina la bozza generata da aestima"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ripristina
            </button>
          )}
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: accent, backgroundColor: `${accent}1f` }}
          >
            {badge}
          </span>
        </div>
      </div>
      <div className="p-4">
        {readOnly ? (
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-muted">
            {value}
          </pre>
        ) : (
          <>
            <AutoTextarea value={value} onChange={onChange} accent={accent} />
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-ink-faint">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              </svg>
              Testo modificabile: puoi adattare la mail prima di inviarla.
            </p>
          </>
        )}
        {attachment && <div className="mt-3">{attachment}</div>}
        {footer && <div className="mt-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Textarea che si adatta in altezza al contenuto. */
function AutoTextarea({
  value,
  onChange,
  accent,
}: {
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={6}
      spellCheck={false}
      className="w-full resize-none rounded-lg border border-border bg-base px-3 py-2.5 font-sans text-sm leading-relaxed text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
      style={{ ["--tw-ring-color" as string]: `${accent}40` }}
    />
  );
}

/** Chip dell'allegato PDF del preventivo con anteprima. */
function QuoteAttachment({
  quote,
  onView,
}: {
  quote: Quote;
  onView: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-2/40 px-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          Preventivo_{quote.number}.pdf
        </p>
        <p className="text-[11px] text-ink-faint">
          Allegato · PDF · {euro(quote.total)} (IVA incl.)
        </p>
      </div>
      <button
        onClick={onView}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand/60 hover:text-ink"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.7" />
        </svg>
        Visualizza
      </button>
    </div>
  );
}

/** Riferimenti cliccabili ai documenti in archivio della macchina. */
function ArchiveLinks({ serial }: { serial: string }) {
  const docs = docsForMachine(serial);
  if (docs.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-base/60">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          Documenti collegati in archivio
          <span className="rounded-full bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-faint">
            {docs.length}
          </span>
        </div>
        <Link
          href={`/archivio?q=${encodeURIComponent(serial)}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-brand transition-colors hover:text-brand-strong"
        >
          Apri in archivio
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
      <div className="p-2">
        {docs.map((f) => (
          <Link
            key={f.id}
            href={`/archivio?q=${encodeURIComponent(f.classification.codice ?? serial)}`}
            className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/60"
          >
            <DocTypeBadge tipo={f.classification.tipo} />
            <span className="min-w-0 flex-1 truncate text-sm text-ink-muted group-hover:text-ink">
              {f.name}
            </span>
            {f.classification.codice && (
              <span className="shrink-0 font-mono text-[11px] text-ink-faint">
                {f.classification.codice}
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-ink-faint transition-colors group-hover:text-brand">
              <path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
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
