"use client";

import { euro } from "@/lib/quote";
import type { AnalysisResult, MatchResult } from "@/lib/types";
import { HumanNote } from "./HumanNote";

// STEP 3 — Ricambio identificato: macchina + componente + disponibilità.

interface Props {
  analysis: AnalysisResult;
  match: MatchResult;
  onBack: () => void;
  onGenerate: () => void;
}

export function PartIdentified({ analysis, match, onBack, onGenerate }: Props) {
  const { machine, component, availability } = match;
  const identified = Boolean(machine && component);

  return (
    <section className="animate-fade-up space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/30 sm:p-8">
        <div className="mb-6">
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Passo 3 — Ricambio identificato
          </div>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">
            {identified
              ? "Ecco cosa ha trovato l'agente"
              : "Serve una verifica del tecnico"}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <SourceBadge source={analysis.source} />
            <UrgencyBadge urgency={analysis.urgenza} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Card macchina */}
          <InfoCard label="Macchina riconosciuta" icon={<MachineIcon />}>
            {machine ? (
              <>
                <p className="text-lg font-semibold text-ink">{machine.model}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row k="Matricola" v={machine.serial} mono />
                  <Row k="Anno" v={String(machine.year)} />
                  <Row k="Categoria" v={machine.category} />
                </dl>
              </>
            ) : (
              <NotFound text={`Nessuna macchina trovata per la matricola "${analysis.numero_serie || "n/d"}".`} />
            )}
          </InfoCard>

          {/* Card componente */}
          <InfoCard label="Componente identificato" icon={<PartIcon />}>
            {component ? (
              <>
                <p className="text-lg font-semibold text-ink">
                  {component.description}
                </p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row k="Codice ricambio" v={component.code} mono highlight />
                  <Row k="Prezzo di listino" v={euro(component.listPrice)} />
                  <Row
                    k="Disponibilità"
                    v={
                      <AvailabilityTag
                        availability={availability}
                        leadTimeDays={component.leadTimeDays}
                      />
                    }
                  />
                </dl>
              </>
            ) : (
              <NotFound text="Componente non identificato con certezza nella distinta." />
            )}
          </InfoCard>
        </div>

        {/* Interpretazione in linguaggio naturale dell'agente */}
        <div className="mt-4 rounded-xl border border-border bg-base/60 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Come l&apos;agente ha letto la richiesta
          </p>
          <p className="text-sm text-ink-muted">
            Componente citato:{" "}
            <span className="text-ink">
              “{analysis.componente_identificato}”
            </span>
            {analysis.note ? ` — ${analysis.note}` : ""}
          </p>
        </div>
      </div>

      <HumanNote />

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
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
          Modifica richiesta
        </button>
        <button
          onClick={onGenerate}
          disabled={!identified}
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-[0.95rem] font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
          title={identified ? undefined : "Identifica prima macchina e componente"}
        >
          Genera preventivo
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}

// ---- sotto-componenti ----

function InfoCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/50 p-5">
      <div className="mb-3 flex items-center gap-2 text-brand">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function Row({
  k,
  v,
  mono,
  highlight,
}: {
  k: string;
  v: React.ReactNode;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink-faint">{k}</dt>
      <dd
        className={[
          "text-right",
          mono ? "font-mono" : "",
          highlight ? "font-semibold text-brand" : "text-ink",
        ].join(" ")}
      >
        {v}
      </dd>
    </div>
  );
}

function AvailabilityTag({
  availability,
  leadTimeDays,
}: {
  availability: MatchResult["availability"];
  leadTimeDays: number;
}) {
  if (availability === "disponibile") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-semibold text-ok">
        <span className="h-1.5 w-1.5 rounded-full bg-ok" />
        Disponibile a magazzino
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-warn/15 px-2.5 py-0.5 text-xs font-semibold text-warn">
      <span className="h-1.5 w-1.5 rounded-full bg-warn" />
      Da ordinare · {leadTimeDays} gg
    </span>
  );
}

function SourceBadge({ source }: { source: AnalysisResult["source"] }) {
  const isAI = source === "anthropic";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isAI
          ? "bg-brand/15 text-brand"
          : "bg-surface-2 text-ink-muted border border-border",
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {isAI ? "Analizzato con Claude" : "Demo locale (mock)"}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency: AnalysisResult["urgenza"] }) {
  if (urgency !== "alta") return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-semibold text-danger">
      Urgenza alta
    </span>
  );
}

function NotFound({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 text-sm text-ink-muted">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-warn"
      >
        <path
          d="M12 8v5m0 3h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {text}
    </p>
  );
}

function MachineIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20V10l6-3 6 3v10M4 20h16M9 20v-4h2v4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="15" cy="12.5" r="1.4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
