"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ConfidenceBadge } from "@/components/archive/ConfidenceBadge";
import {
  CATALOG_SOURCES,
  DEMO_CATALOG_ARTICLES,
} from "@/lib/catalogAnalysisData";
import {
  buildCatalogSummary,
  buildImpact,
} from "@/lib/catalogAnalysis";
import type {
  CatalogArticle,
  CatalogFinding,
  CatalogSummary,
  FindingKind,
  ImpactSummary,
  ReviewDecision,
} from "@/lib/catalogAnalysisTypes";
import {
  CATEGORY_LABELS,
  FINDING_KIND_META,
  HIGH_CONFIDENCE_THRESHOLD,
} from "@/lib/catalogAnalysisTypes";

// Demo proiettore: l'agente trova e propone, l'esperto conferma.
// Stato solo in React (niente localStorage / sessionStorage).

type Phase = "idle" | "analyzing" | "done";

const ANALYSIS_STAGES = [
  { label: "Estraggo e normalizzo i codici", hint: "Pulizia codice e descrizione" },
  { label: "Incrocio i cataloghi", hint: "Listino · Catalogo PDF · Distinta" },
  { label: "Verifico contro il gestionale", hint: "Anagrafica ERP e giacenze" },
  { label: "Identifico incoerenze", hint: "Duplicati, obsoleti, descrizioni" },
  { label: "Calcolo prezzi mancanti", hint: "Acquisto × moltiplicatore categoria" },
] as const;

const KIND_ORDER: FindingKind[] = [
  "duplicate",
  "obsolete",
  "substitution",
  "erp_discrepancy",
  "inconsistent_description",
  "missing_price",
];

const STAGE_TICKS = 20;
const TICK_MS = 280;

type DecisionMap = Record<string, ReviewDecision>;

const idleSummary = buildCatalogSummary(DEMO_CATALOG_ARTICLES);

export function CatalogAnalysisWorkspace() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [tick, setTick] = useState(0);
  const [apiDone, setApiDone] = useState(false);
  const [apiSource, setApiSource] = useState<"anthropic" | "mock">("mock");
  const [summary, setSummary] = useState<CatalogSummary>(idleSummary);
  const [findings, setFindings] = useState<CatalogFinding[]>([]);
  const [impact, setImpact] = useState<ImpactSummary | null>(null);
  const [articles, setArticles] = useState<CatalogArticle[]>(DEMO_CATALOG_ARTICLES);
  const [decisions, setDecisions] = useState<DecisionMap>({});
  const [correctingId, setCorrectingId] = useState<string | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const [openKinds, setOpenKinds] = useState<Partial<Record<FindingKind, boolean>>>(
    {}
  );
  const [error, setError] = useState<string | null>(null);

  const stage = Math.min(
    Math.floor(tick / (STAGE_TICKS / ANALYSIS_STAGES.length)),
    ANALYSIS_STAGES.length - 1
  );

  useEffect(() => {
    if (phase !== "analyzing") return;
    if (tick >= STAGE_TICKS) return;
    const t = setTimeout(() => setTick((v) => v + 1), TICK_MS);
    return () => clearTimeout(t);
  }, [phase, tick]);

  useEffect(() => {
    if (phase !== "analyzing") return;
    if (tick >= STAGE_TICKS && apiDone) {
      const t = setTimeout(() => setPhase("done"), 400);
      return () => clearTimeout(t);
    }
  }, [phase, tick, apiDone]);

  const startAnalysis = useCallback(async () => {
    setPhase("analyzing");
    setTick(0);
    setApiDone(false);
    setError(null);
    setDecisions({});
    setCorrectingId(null);
    setCorrectionNote("");
    setFindings([]);
    setImpact(null);
    setOpenKinds({});

    try {
      const res = await fetch("/api/catalog-analyze", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data.summary);
      setFindings(data.findings ?? []);
      setImpact(data.impact ?? buildImpact(data.findings ?? []));
      setArticles(data.articles ?? DEMO_CATALOG_ARTICLES);
      setApiSource(data.source === "anthropic" ? "anthropic" : "mock");
      // Apri le sezioni con finding
      const open: Partial<Record<FindingKind, boolean>> = {};
      for (const f of data.findings as CatalogFinding[]) {
        open[f.kind] = true;
      }
      setOpenKinds(open);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analisi non riuscita");
      setPhase("idle");
    } finally {
      setApiDone(true);
    }
  }, []);

  const pendingFindings = useMemo(
    () => findings.filter((f) => (decisions[f.id] ?? "pending") === "pending"),
    [findings, decisions]
  );

  const highConfidencePending = useMemo(
    () =>
      pendingFindings.filter((f) => f.confidence >= HIGH_CONFIDENCE_THRESHOLD),
    [pendingFindings]
  );

  const validatedCount = useMemo(
    () =>
      Object.values(decisions).filter(
        (d) => d === "confirmed" || d === "corrected"
      ).length,
    [decisions]
  );

  const setDecision = (id: string, d: ReviewDecision) => {
    setDecisions((prev) => ({ ...prev, [id]: d }));
    if (d !== "pending") {
      setCorrectingId(null);
      setCorrectionNote("");
    }
  };

  const confirmHighConfidence = () => {
    setDecisions((prev) => {
      const next = { ...prev };
      for (const f of highConfidencePending) {
        next[f.id] = "confirmed";
      }
      return next;
    });
  };

  const findingsByKind = useMemo(() => {
    const map = new Map<FindingKind, CatalogFinding[]>();
    for (const k of KIND_ORDER) map.set(k, []);
    for (const f of findings) {
      const list = map.get(f.kind) ?? [];
      list.push(f);
      map.set(f.kind, list);
    }
    return map;
  }, [findings]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-surface/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Analisi catalogo
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted sm:text-base">
              L&apos;agente trova e propone, l&apos;esperto conferma. Niente viene
              applicato in automatico.
            </p>
          </div>
          {phase === "done" && (
            <button
              type="button"
              onClick={() => {
                setPhase("idle");
                setFindings([]);
                setImpact(null);
                setDecisions({});
                setSummary(idleSummary);
              }}
              className="rounded-lg border border-border bg-base px-3 py-2 text-sm font-medium text-ink-muted hover:border-border-strong hover:text-ink"
            >
              Nuova analisi
            </button>
          )}
        </div>

        {/* Catalogo caricato — riepilogo */}
        <div className="mt-4 rounded-xl border border-border bg-base/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Catalogo caricato (dati di esempio)
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                {CATALOG_SOURCES.map((s) => s.fileName).join(" · ")}
              </p>
            </div>
            {phase === "idle" && (
              <button
                type="button"
                onClick={startAnalysis}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong sm:text-base"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                Analizza catalogo
              </button>
            )}
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Stat label="Articoli" value={summary.articleCount} />
            <Stat label="Codici unici" value={summary.uniqueCodes} />
            <Stat label="Con prezzo" value={summary.withPrice} />
            <Stat label="Senza prezzo" value={summary.withoutPrice} warn />
            <Stat label="In gestionale" value={summary.inErp} />
            <Stat label="Assenti ERP" value={summary.notInErp} warn />
          </dl>

          <div className="mt-3 flex flex-wrap gap-2">
            {summary.sources.map((s) => (
              <span
                key={s.id}
                className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted"
              >
                {s.label}
                <span className="ml-1.5 tabular-nums text-ink">{s.count}</span>
              </span>
            ))}
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            In produzione l&apos;analisi girerebbe sul catalogo reale (PDF /
            export gestionale) del cliente; qui usiamo il dataset demo Vallmec
            allineato a listino 2026 e Catalogo VLM-2200.
          </p>
        </div>

        {error && (
          <p className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {phase === "analyzing" && (
          <AnalysisStages stage={stage} source={apiSource} tick={tick} />
        )}

        {phase === "done" && impact && (
          <div className="mx-auto max-w-5xl space-y-5 px-5 py-5">
            <ImpactBanner
              impact={impact}
              validatedCount={validatedCount}
              total={findings.length}
              source={apiSource}
            />

            {/* Coda di revisione umana — elemento centrale */}
            <ReviewQueuePanel
              pending={pendingFindings}
              highConfidenceCount={highConfidencePending.length}
              validatedCount={validatedCount}
              total={findings.length}
              decisions={decisions}
              correctingId={correctingId}
              correctionNote={correctionNote}
              onConfirmHigh={confirmHighConfidence}
              onDecision={setDecision}
              onStartCorrect={(id) => {
                setCorrectingId(id);
                setCorrectionNote("");
              }}
              onCancelCorrect={() => {
                setCorrectingId(null);
                setCorrectionNote("");
              }}
              onCorrectionNote={setCorrectionNote}
              onSubmitCorrection={(id) => {
                if (!correctionNote.trim()) return;
                setDecision(id, "corrected");
              }}
            />

            {/* Risultati per tipo */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-ink">Risultati per tipo</h2>
              {KIND_ORDER.map((kind) => {
                const list = findingsByKind.get(kind) ?? [];
                if (list.length === 0) return null;
                const meta = FINDING_KIND_META[kind];
                const open = openKinds[kind] ?? false;
                return (
                  <ExpandableSection
                    key={kind}
                    title={meta.label}
                    count={list.length}
                    actionHint={meta.actionHint}
                    open={open}
                    onToggle={() =>
                      setOpenKinds((prev) => ({ ...prev, [kind]: !open }))
                    }
                  >
                    <ul className="space-y-2 p-3 pt-0">
                      {list.map((f) => (
                        <FindingCard
                          key={f.id}
                          finding={f}
                          decision={decisions[f.id] ?? "pending"}
                          articles={articles}
                        />
                      ))}
                    </ul>
                  </ExpandableSection>
                );
              })}
            </section>

            <p className="pb-6 text-center text-sm font-medium text-ink-muted">
              L&apos;agente trova e propone, l&apos;esperto conferma.
            </p>
          </div>
        )}

        {phase === "idle" && (
          <div className="flex flex-1 items-center justify-center px-5 py-16">
            <div className="max-w-md text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-brand/40 bg-brand-soft text-brand">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7h16M4 12h10M4 17h14"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-base text-ink-muted sm:text-lg">
                Avvia l&apos;analisi per far scovare all&apos;agente duplicati,
                obsoleti, sostituzioni e prezzi mancanti — poi valida tu le
                proposte.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface/60 px-3 py-2.5">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </dt>
      <dd
        className={[
          "mt-0.5 text-2xl font-bold tabular-nums",
          warn && value > 0 ? "text-warn" : "text-ink",
        ].join(" ")}
      >
        {value}
      </dd>
    </div>
  );
}

function AnalysisStages({
  stage,
  source,
  tick,
}: {
  stage: number;
  source: "anthropic" | "mock";
  tick: number;
}) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-10">
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-brand/30 [animation:pulse-ring_1.8s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-brand/20 [animation:pulse-ring_1.8s_ease-out_infinite_0.6s]" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-brand/50 bg-brand-soft">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand" aria-hidden="true">
            <path
              d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0ZM9 12h6M9 16h4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <h2 className="text-center text-xl font-bold text-ink sm:text-2xl">
        aestima sta analizzando il catalogo…
      </h2>
      <p className="mt-1 text-center text-sm text-ink-muted sm:text-base">
        {source === "anthropic"
          ? "Giudizio fuzzy con Claude · regole deterministiche sul resto"
          : "Analisi locale (mock) · l'esperto conferma sempre"}
        {" · "}
        <span className="tabular-nums text-ink">
          {Math.min(tick, STAGE_TICKS)}/{STAGE_TICKS}
        </span>
      </p>

      <ul className="mt-8 w-full space-y-2">
        {ANALYSIS_STAGES.map((s, i) => {
          const done = i < stage || (i === stage && tick >= STAGE_TICKS);
          const current = i === stage && tick < STAGE_TICKS;
          return (
            <li
              key={s.label}
              className={[
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all",
                done
                  ? "border-border bg-surface-2/50"
                  : current
                    ? "border-brand/50 bg-brand-soft animate-fade-up"
                    : "border-transparent opacity-40",
              ].join(" ")}
            >
              {done ? (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand/20 text-brand">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path
                      d="M4 10.5 8 14.5 16 5.5"
                      stroke="currentColor"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              ) : current ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              ) : (
                <span className="h-2.5 w-2.5 rounded-full bg-ink-faint" />
              )}
              <div className="min-w-0">
                <p
                  className={`text-sm font-semibold sm:text-base ${
                    current ? "text-ink" : "text-ink-muted"
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-ink-faint sm:text-sm">{s.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ImpactBanner({
  impact,
  validatedCount,
  total,
  source,
}: {
  impact: ImpactSummary;
  validatedCount: number;
  total: number;
  source: "anthropic" | "mock";
}) {
  const hours = (impact.estimatedMinutesSaved / 60).toFixed(1);
  return (
    <section className="rounded-xl border border-brand/30 bg-brand-soft/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-ink">Impatto dell&apos;analisi</h2>
        <span className="rounded-full bg-base/80 px-2.5 py-0.5 text-xs font-medium text-ink-muted">
          {source === "anthropic" ? "Claude + regole" : "Mock + regole"}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Incoerenze" value={impact.totalFindings} />
        <Stat label="Alta confidenza" value={impact.highConfidence} />
        <Stat label="Da verificare" value={impact.needsReview} warn />
        <div className="rounded-lg border border-border bg-base/70 px-3 py-2.5">
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Tempo stimato risparmiato
          </dt>
          <dd className="mt-0.5 text-2xl font-bold tabular-nums text-ok">
            ~{hours}h
          </dd>
          <p className="text-[11px] text-ink-faint">
            vs ~{impact.estimatedMinutesSaved} min a mano
          </p>
        </div>
      </dl>
      <p className="mt-3 text-sm text-ink-muted">
        Validati{" "}
        <span className="font-semibold tabular-nums text-ink">
          {validatedCount}/{total}
        </span>
        . L&apos;agente trova e propone, l&apos;esperto conferma.
      </p>
    </section>
  );
}

function ReviewQueuePanel({
  pending,
  highConfidenceCount,
  validatedCount,
  total,
  decisions,
  correctingId,
  correctionNote,
  onConfirmHigh,
  onDecision,
  onStartCorrect,
  onCancelCorrect,
  onCorrectionNote,
  onSubmitCorrection,
}: {
  pending: CatalogFinding[];
  highConfidenceCount: number;
  validatedCount: number;
  total: number;
  decisions: DecisionMap;
  correctingId: string | null;
  correctionNote: string;
  onConfirmHigh: () => void;
  onDecision: (id: string, d: ReviewDecision) => void;
  onStartCorrect: (id: string) => void;
  onCancelCorrect: () => void;
  onCorrectionNote: (v: string) => void;
  onSubmitCorrection: (id: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-warn/40 bg-warn/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-warn/15 text-warn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 8v5m0 3h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <h2 className="text-lg font-bold text-ink">Coda di revisione</h2>
            <span className="rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-warn">
              {pending.length} in coda
            </span>
            <span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ok">
              {validatedCount} validati
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-muted">
            Dall&apos;esperto che corregge a cucchiaino a chi conferma in blocco
            le proposte ad alta confidenza.
          </p>
        </div>
        <button
          type="button"
          disabled={highConfidenceCount === 0}
          onClick={onConfirmHigh}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          Conferma alta confidenza
          <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs tabular-nums">
            {highConfidenceCount}
          </span>
        </button>
      </div>

      {pending.length === 0 ? (
        <div className="mt-4 rounded-xl border border-ok/30 bg-ok/5 px-4 py-6 text-center">
          <p className="text-base font-semibold text-ok">Coda vuota</p>
          <p className="mt-1 text-sm text-ink-muted">
            Tutte le proposte sono state confermate, corrette o ignorate (
            {validatedCount}/{total} validate).
          </p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {pending.map((f) => (
            <li
              key={f.id}
              className="rounded-xl border border-border bg-base/70 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                      {FINDING_KIND_META[f.kind].label}
                    </span>
                    <ConfidenceBadge confidence={f.confidence} showLabel />
                    <code className="text-xs font-semibold text-brand">
                      {f.codes.join(" · ")}
                    </code>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink sm:text-base">
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">{f.summary}</p>
                  <p className="mt-1.5 text-xs font-medium text-ink-faint">
                    Azione proposta: {f.proposedAction}
                  </p>
                </div>
              </div>

              {correctingId === f.id ? (
                <div className="mt-3 flex flex-wrap items-end gap-2">
                  <label className="min-w-[220px] flex-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                      Correzione esperto
                    </span>
                    <input
                      value={correctionNote}
                      onChange={(e) => onCorrectionNote(e.target.value)}
                      placeholder="Es. usa descrizione listino; prezzo €…"
                      className="mt-1 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!correctionNote.trim()}
                    onClick={() => onSubmitCorrection(f.id)}
                    className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-40"
                  >
                    Salva correzione
                  </button>
                  <button
                    type="button"
                    onClick={onCancelCorrect}
                    className="rounded-lg border border-border px-3 py-2 text-sm text-ink-muted hover:text-ink"
                  >
                    Annulla
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onDecision(f.id, "confirmed")}
                    className="rounded-lg bg-ok px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
                  >
                    Conferma
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartCorrect(f.id)}
                    className="rounded-lg border border-border bg-base px-3 py-1.5 text-sm font-semibold text-ink hover:border-brand/40"
                  >
                    Correggi
                  </button>
                  <button
                    type="button"
                    onClick={() => onDecision(f.id, "ignored")}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink"
                  >
                    Ignora
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Decisioni già prese (compatto) */}
      {Object.keys(decisions).some((id) => decisions[id] !== "pending") && (
        <details className="mt-4 rounded-lg border border-border bg-base/40 px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium text-ink-muted">
            Storico decisioni ({validatedCount} validate + ignorate)
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-ink-faint">
            {Object.entries(decisions)
              .filter(([, d]) => d !== "pending")
              .map(([id, d]) => (
                <li key={id} className="flex gap-2 tabular-nums">
                  <span className="font-semibold text-ink-muted">{d}</span>
                  <span>{id}</span>
                </li>
              ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function ExpandableSection({
  title,
  count,
  actionHint,
  open,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  actionHint: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-base/60">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface/60"
      >
        <span
          className={[
            "text-ink-faint transition-transform",
            open ? "rotate-90" : "",
          ].join(" ")}
        >
          ▸
        </span>
        <span className="flex-1 text-base font-semibold text-ink">{title}</span>
        <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-bold tabular-nums text-brand">
          {count}
        </span>
        <span className="hidden text-xs text-ink-faint sm:inline">
          Azione: {actionHint}
        </span>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}

function FindingCard({
  finding,
  decision,
  articles,
}: {
  finding: CatalogFinding;
  decision: ReviewDecision;
  articles: CatalogArticle[];
}) {
  const byId = useMemo(
    () => new Map(articles.map((a) => [a.id, a])),
    [articles]
  );

  return (
    <li className="rounded-lg border border-border bg-surface/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-ink">{finding.title}</p>
        <ConfidenceBadge confidence={finding.confidence} />
        {decision !== "pending" && (
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              decision === "confirmed" || decision === "corrected"
                ? "bg-ok/15 text-ok"
                : "bg-ink-faint/20 text-ink-muted",
            ].join(" ")}
          >
            {decision === "confirmed"
              ? "Confermato"
              : decision === "corrected"
                ? "Corretto"
                : "Ignorato"}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-muted">{finding.summary}</p>
      <p className="mt-1 text-xs font-medium text-brand">
        → {finding.proposedAction}
      </p>

      {finding.kind === "duplicate" && (
        <ul className="mt-2 space-y-1 text-xs text-ink-muted">
          {(
            (finding.detail.appearances as {
              source: string;
              location: string;
              description: string;
            }[]) ?? []
          ).map((a, i) => (
            <li key={i} className="rounded-md bg-base/60 px-2 py-1.5">
              <span className="font-semibold text-ink">{a.source}</span>
              {" · "}
              {a.location}
              <br />
              <span className="text-ink-faint">{a.description}</span>
            </li>
          ))}
        </ul>
      )}

      {finding.kind === "substitution" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <code className="rounded bg-danger/10 px-2 py-1 font-semibold text-danger">
            {(finding.detail.old as { code: string })?.code}
          </code>
          <span className="text-ink-faint">→</span>
          <code className="rounded bg-ok/10 px-2 py-1 font-semibold text-ok">
            {(finding.detail.new as { code: string })?.code}
          </code>
        </div>
      )}

      {finding.kind === "inconsistent_description" && (
        <ul className="mt-2 space-y-1 text-xs">
          {(
            (finding.detail.variants as {
              source: string;
              description: string;
            }[]) ?? []
          ).map((v, i) => (
            <li key={i}>
              <span className="font-medium text-ink-muted">{v.source}:</span>{" "}
              {v.description}
            </li>
          ))}
          {finding.detail.suggestedCanonical ? (
            <li className="mt-1 font-medium text-ok">
              Proposta: {String(finding.detail.suggestedCanonical)}
            </li>
          ) : null}
        </ul>
      )}

      {finding.priceProposal && (
        <div className="mt-2 rounded-lg border border-brand/25 bg-brand-soft/50 px-3 py-2 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Calcolo prezzo proposto
          </p>
          <p className="mt-1 tabular-nums text-ink">
            Acquisto €{finding.priceProposal.purchasePrice.toFixed(2)}
            {" × "}
            {CATEGORY_LABELS[finding.priceProposal.category]} (
            {finding.priceProposal.multiplier.toFixed(1)}×)
            {" = "}
            <span className="font-bold text-brand">
              €{finding.priceProposal.proposedPrice.toFixed(2)}
            </span>
          </p>
        </div>
      )}

      {finding.kind === "erp_discrepancy" &&
        finding.detail.type === "price_mismatch" && (
          <p className="mt-2 text-xs tabular-nums text-ink-muted">
            Catalogo €{Number(finding.detail.catalogPrice).toFixed(2)} · ERP €
            {Number(finding.detail.erpPrice).toFixed(2)}
          </p>
        )}

      {finding.articleIds.length > 0 && finding.kind === "obsolete" && (
        <p className="mt-2 text-xs text-ink-faint">
          {byId.get(finding.articleIds[0])?.location ?? ""}
        </p>
      )}
    </li>
  );
}
