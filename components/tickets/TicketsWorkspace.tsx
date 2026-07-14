"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_SOURCE_LABELS,
  TICKET_STATUSES,
} from "@/lib/ticketData";
import type {
  ServiceTicketRecord,
  TicketStatus,
  UpdateTicketInput,
} from "@/lib/ticketTypes";
import { CreateTicketModal } from "./CreateTicketModal";
import { TicketStatusPill } from "./TicketStatusPill";

type Tab = "aperti" | "tutti" | "chiusi";

const TABS: { id: Tab; label: string }[] = [
  { id: "aperti", label: "Aperti" },
  { id: "tutti", label: "Tutti" },
  { id: "chiusi", label: "Chiusi / risolti" },
];

const OPEN_STATUSES: TicketStatus[] = [
  "aperto",
  "assegnato",
  "in_lavorazione",
  "in_attesa_cliente",
];

const CLOSED_STATUSES: TicketStatus[] = ["risolto", "chiuso"];

export function TicketsWorkspace() {
  const { tickets, technicians, createTicket, updateTicket, addKnowledgeEntry } =
    useInbox();
  const [tab, setTab] = useState<Tab>("aperti");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    tickets[0]?.id ?? null
  );
  const [showCreate, setShowCreate] = useState(false);

  const techById = useMemo(
    () => Object.fromEntries(technicians.map((t) => [t.id, t])),
    [technicians]
  );

  const filtered = useMemo(() => {
    let list = tickets;
    if (tab === "aperti") {
      list = list.filter((t) => OPEN_STATUSES.includes(t.status));
    } else if (tab === "chiusi") {
      list = list.filter((t) => CLOSED_STATUSES.includes(t.status));
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list;
  }, [tickets, tab, statusFilter]);

  const selected =
    filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  const counts = useMemo(
    () => ({
      aperti: tickets.filter((t) => OPEN_STATUSES.includes(t.status)).length,
      tutti: tickets.length,
      chiusi: tickets.filter((t) => CLOSED_STATUSES.includes(t.status)).length,
    }),
    [tickets]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Tab principali */}
      <div className="border-b border-border bg-surface/40 px-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-6">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setStatusFilter("all");
                }}
                className={[
                  "relative py-3 text-sm font-medium transition-colors",
                  tab === t.id
                    ? "text-ink"
                    : "text-ink-faint hover:text-ink-muted",
                ].join(" ")}
              >
                {t.label}
                <span className="ml-1.5 text-xs text-ink-faint">
                  {counts[t.id]}
                </span>
                {tab === t.id && (
                  <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
                )}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-strong"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Nuovo ticket
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Lista ticket */}
        <div className="flex w-full min-w-0 flex-col border-b border-border lg:w-[420px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-ink">Ticket service</h2>
            <p className="text-xs text-ink-faint">
              {filtered.length} in vista · escalation da chat AI e creazione
              manuale
            </p>
            {tab !== "chiusi" && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <FilterChip
                  active={statusFilter === "all"}
                  onClick={() => setStatusFilter("all")}
                  label="Tutti"
                />
                {TICKET_STATUSES.filter((s) =>
                  tab === "aperti"
                    ? OPEN_STATUSES.includes(s.id)
                    : true
                ).map((s) => (
                    <FilterChip
                      key={s.id}
                      active={statusFilter === s.id}
                      onClick={() => setStatusFilter(s.id)}
                      label={s.label}
                      color={s.color}
                    />
                  ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-faint">
                Nessun ticket in questa vista.
              </div>
            ) : (
              filtered.map((t) => (
                <TicketListRow
                  key={t.id}
                  ticket={t}
                  active={t.id === selected?.id}
                  technicianName={
                    t.assignedTechnicianId
                      ? techById[t.assignedTechnicianId]?.name
                      : undefined
                  }
                  onSelect={() => setSelectedId(t.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Dettaglio */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {selected ? (
            <TicketDetail
              ticket={selected}
              technicians={technicians}
              onUpdate={updateTicket}
              onLearnFromSolution={addKnowledgeEntry}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-ink-faint">
              Seleziona un ticket per vedere il dettaglio.
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreate={(input) => {
            const id = createTicket(input);
            setSelectedId(id);
            setTab("aperti");
          }}
        />
      )}
    </div>
  );
}

function TicketListRow({
  ticket,
  active,
  technicianName,
  onSelect,
}: {
  ticket: ServiceTicketRecord;
  active: boolean;
  technicianName?: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "flex w-full flex-col gap-1.5 border-b border-border/60 px-4 py-3 text-left transition-colors",
        active ? "bg-brand-soft" : "hover:bg-surface/70",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <TicketStatusPill status={ticket.status} compact />
        {ticket.priority === "alta" && (
          <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger">
            Alta
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {ticket.summary}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-brand">
          #{ticket.id}
        </span>
      </div>
      <p className="truncate text-xs text-ink-faint">
        {ticket.machineSerial ?? "Macchina n/d"} ·{" "}
        {TICKET_SOURCE_LABELS[ticket.source]} · {ticket.createdLabel}
      </p>
      {technicianName && (
        <p className="truncate text-xs text-ink-muted">
          Tecnico: {technicianName}
        </p>
      )}
    </button>
  );
}

function TicketDetail({
  ticket,
  technicians,
  onUpdate,
  onLearnFromSolution,
}: {
  ticket: ServiceTicketRecord;
  technicians: { id: string; name: string }[];
  onUpdate: (id: string, input: UpdateTicketInput) => void;
  onLearnFromSolution: ReturnType<typeof useInbox>["addKnowledgeEntry"];
}) {
  const [notes, setNotes] = useState(ticket.internalNotes ?? "");
  const [solution, setSolution] = useState(ticket.solution ?? "");
  const [learning, setLearning] = useState(false);
  const [learnMsg, setLearnMsg] = useState<string | null>(null);

  useEffect(() => {
    setNotes(ticket.internalNotes ?? "");
    setSolution(ticket.solution ?? "");
    setLearnMsg(null);
  }, [ticket.id, ticket.internalNotes, ticket.solution]);

  const assigned = technicians.find((t) => t.id === ticket.assignedTechnicianId);
  const isClosed =
    ticket.status === "risolto" || ticket.status === "chiuso";

  const closeAndLearn = async () => {
    const sol = solution.trim();
    if (!sol) {
      setLearnMsg("Scrivi la soluzione del tecnico prima di chiudere.");
      return;
    }
    if (ticket.knowledgeEntryId) {
      setLearnMsg(`Già in knowledge base: ${ticket.knowledgeEntryId}`);
      return;
    }

    setLearning(true);
    setLearnMsg(null);
    try {
      const res = await fetch("/api/knowledge-extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          summary: ticket.summary,
          description: ticket.description,
          solution: sol,
          machineModel: ticket.machineModel,
          machineSerial: ticket.machineSerial,
        }),
      });
      const data = await res.json();
      const extracted = data.entry ?? data.fallback;
      if (!extracted) {
        setLearnMsg(data.error ?? "Estrazione non riuscita.");
        return;
      }

      const kbId = onLearnFromSolution({
        machineModel: extracted.machineModel,
        machineSerial: extracted.machineSerial,
        problemCategory: extracted.problemCategory ?? ticket.category,
        symptom: extracted.symptom,
        probableCause: extracted.probableCause,
        solution: extracted.solution,
        spareParts: extracted.spareParts ?? [],
        tags: extracted.tags ?? [],
        sourceTicketId: ticket.id,
      });

      onUpdate(ticket.id, {
        status: "chiuso",
        solution: sol,
        knowledgeEntryId: kbId,
      });
      setLearnMsg(
        `Ticket chiuso. Soluzione aggiunta alla knowledge base (${kbId}) — la chat la userà per problemi simili.`
      );
    } catch {
      setLearnMsg("Errore di rete durante l'apprendimento.");
    } finally {
      setLearning(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-sm font-semibold text-brand">
            #{ticket.id}
          </p>
          <h2 className="text-xl font-bold text-ink">{ticket.summary}</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Creato {ticket.createdFull} · Aggiornato {ticket.updatedFull}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusPill status={ticket.status} />
          {ticket.priority === "alta" && (
            <span className="rounded-full bg-danger/15 px-2.5 py-0.5 text-xs font-semibold text-danger">
              Priorità alta
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-base/60 p-4 sm:grid-cols-2">
        <MetaField label="Origine">
          {TICKET_SOURCE_LABELS[ticket.source]}
        </MetaField>
        <MetaField label="Categoria">
          {TICKET_CATEGORY_LABELS[ticket.category]}
        </MetaField>
        <MetaField label="Macchina">
          {ticket.machineModel ?? "—"}
        </MetaField>
        <MetaField label="Matricola">
          {ticket.machineSerial ?? "—"}
        </MetaField>
        <MetaField label="Tecnico assegnato" className="sm:col-span-2">
          {assigned?.name ?? "Non assegnato"}
        </MetaField>
      </div>

      <article className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Descrizione
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">
          {ticket.description}
        </p>
      </article>

      {ticket.source === "chat_ai" && (
        <div className="rounded-xl border border-brand/30 bg-brand-soft/50 px-4 py-3 text-sm text-ink-muted">
          Aperto automaticamente dalla{" "}
          <Link href="/assistenza" className="font-medium text-brand hover:underline">
            chat assistenza AI
          </Link>{" "}
          quando l&apos;agente non ha trovato la risposta nei dati disponibili.
        </div>
      )}

      {ticket.knowledgeEntryId && (
        <div className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ink-muted">
          Soluzione in knowledge base:{" "}
          <Link href="/manuale" className="font-mono font-medium text-brand hover:underline">
            {ticket.knowledgeEntryId}
          </Link>
          . La chat proporrà questa soluzione per problemi simili.
        </div>
      )}

      <div className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Soluzione tecnico
        </p>
        <textarea
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          rows={4}
          disabled={isClosed && !!ticket.knowledgeEntryId}
          className="w-full resize-none rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
          placeholder="Descrivi la soluzione applicata: diagnosi, ricambi sostituiti, procedure…"
        />
        {!isClosed && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => void closeAndLearn()}
              disabled={learning || !solution.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {learning ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              Chiudi e insegna al sistema
            </button>
            <button
              onClick={() =>
                onUpdate(ticket.id, {
                  solution: solution.trim() || undefined,
                })
              }
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink"
            >
              Salva bozza soluzione
            </button>
          </div>
        )}
        {learnMsg && <p className="mt-2 text-xs text-brand">{learnMsg}</p>}
        <p className="mt-2 text-[11px] text-ink-faint">
          Alla chiusura l&apos;AI estrae una scheda strutturata e la aggiunge al{" "}
          <Link href="/manuale" className="text-brand hover:underline">
            Manuale
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Assegna tecnico
        </p>
        <div className="flex flex-wrap gap-2">
          {technicians.map((tech) => (
            <button
              key={tech.id}
              onClick={() =>
                onUpdate(ticket.id, { assignedTechnicianId: tech.id })
              }
              className={[
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                ticket.assignedTechnicianId === tech.id
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink",
              ].join(" ")}
            >
              {tech.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Aggiorna stato
        </p>
        <div className="flex flex-wrap gap-2">
          {TICKET_STATUSES.map((s) => (
            <button
              key={s.id}
              onClick={() => onUpdate(ticket.id, { status: s.id })}
              disabled={ticket.status === s.id}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-40"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Note interne
        </p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          placeholder="Appunti per il team tecnico…"
        />
        <button
          onClick={() =>
            onUpdate(ticket.id, { internalNotes: notes.trim() || undefined })
          }
          className="mt-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
        >
          Salva note
        </button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-brand/50 bg-brand-soft text-ink"
          : "border-border bg-base text-ink-muted hover:border-border-strong",
      ].join(" ")}
    >
      {color && (
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

function MetaField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p className="text-sm text-ink">{children}</p>
    </div>
  );
}
