"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInbox } from "@/components/inbox/InboxProvider";
import { openStageIds, terminalStageIds } from "@/lib/ticketData";
import { CreateTicketModal } from "./CreateTicketModal";
import { TicketStatusPill } from "./TicketStatusPill";

export function TicketDashboard() {
  const { tickets, ticketStages, requests, conversations, createTicket } =
    useInbox();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  const openIds = openStageIds(ticketStages);
  const closedIds = terminalStageIds(ticketStages);

  const stats = useMemo(() => {
    const open = tickets.filter((t) => openIds.includes(t.status));
    const closed = tickets.filter((t) => closedIds.includes(t.status));
    const high = open.filter((t) => t.priority === "alta");
    const unassigned = open.filter((t) => !t.assignedTechnicianId);
    const byStage = ticketStages.map((stage) => ({
      ...stage,
      count: tickets.filter((t) => t.status === stage.id).length,
    }));
    const maxStage = Math.max(1, ...byStage.map((s) => s.count));
    return {
      open: open.length,
      closed: closed.length,
      high: high.length,
      unassigned: unassigned.length,
      byStage,
      maxStage,
      recent: tickets.slice(0, 8),
      urgent: high.slice(0, 6),
      inboxNew: requests.filter((r) => r.status === "nuova").length,
      chatsOpen: conversations.filter((c) => c.status === "aperto").length,
    };
  }, [tickets, ticketStages, requests, conversations, openIds, closedIds]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border bg-surface/40 px-5 py-3">
        <div>
          <h1 className="text-sm font-semibold text-ink">Dashboard</h1>
          <p className="text-xs text-ink-faint">
            Panoramica dei ticket e di quello che richiede attenzione.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/ticket/coda"
            className="rounded-lg border border-border bg-base px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            Coda
          </Link>
          <button
            type="button"
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

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            href="/ticket/lista"
            label="Aperti"
            value={stats.open}
            hint="In lavorazione o da assegnare"
          />
          <Kpi
            href="/ticket/lista"
            label="Alta priorità"
            value={stats.high}
            hint="Ticket aperti urgenti"
            accent={stats.high > 0 ? "warn" : undefined}
          />
          <Kpi
            href="/ticket/coda"
            label="Da assegnare"
            value={stats.unassigned}
            hint="Senza tecnico"
          />
          <Kpi
            href="/ticket/lista"
            label="Chiusi / risolti"
            value={stats.closed}
            hint="Stage terminali"
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Link
            href="/ticket/inbox"
            className="rounded-xl border border-border bg-surface/60 px-4 py-3 hover:border-border-strong"
          >
            <p className="text-xs font-medium text-ink-faint">Inbox email</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {stats.inboxNew}{" "}
              <span className="text-sm font-medium text-ink-muted">nuove</span>
            </p>
          </Link>
          <Link
            href="/ticket/chat"
            className="rounded-xl border border-border bg-surface/60 px-4 py-3 hover:border-border-strong"
          >
            <p className="text-xs font-medium text-ink-faint">Chat live</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {stats.chatsOpen}{" "}
              <span className="text-sm font-medium text-ink-muted">aperte</span>
            </p>
          </Link>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Per stage</h2>
              <Link
                href="/ticket/coda"
                className="text-xs font-medium text-brand hover:underline"
              >
                Apri coda
              </Link>
            </div>
            {tickets.length === 0 ? (
              <EmptyHint />
            ) : (
              <ul className="space-y-2.5">
                {stats.byStage.map((stage) => (
                  <li key={stage.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 text-ink-muted">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="truncate">{stage.label}</span>
                      </span>
                      <span className="font-semibold text-ink">{stage.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(stage.count / stats.maxStage) * 100}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-surface/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink">Alta priorità</h2>
              <Link
                href="/ticket/lista"
                className="text-xs font-medium text-brand hover:underline"
              >
                Tutti i ticket
              </Link>
            </div>
            {stats.urgent.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-faint">
                Nessun ticket urgente aperto.
              </p>
            ) : (
              <ul className="space-y-2">
                {stats.urgent.map((t) => (
                  <TicketRow key={t.id} id={t.id} summary={t.summary} status={t.status} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="mt-5 rounded-2xl border border-border bg-surface/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Ultimi ticket</h2>
            <Link
              href="/ticket/lista"
              className="text-xs font-medium text-brand hover:underline"
            >
              Vedi lista
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/ticket/lista?id=${encodeURIComponent(t.id)}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-surface-2/40"
                  >
                    <span className="w-24 shrink-0 font-mono text-[11px] text-brand">
                      #{t.id}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {t.summary}
                    </span>
                    <TicketStatusPill status={t.status} />
                    <span className="hidden w-20 shrink-0 text-right text-[11px] text-ink-faint sm:block">
                      {t.updatedFull}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onCreate={(input) => {
            const id = createTicket(input);
            router.push(`/ticket/lista?id=${encodeURIComponent(id)}`);
          }}
        />
      )}
    </div>
  );
}

function Kpi({
  href,
  label,
  value,
  hint,
  accent,
}: {
  href: string;
  label: string;
  value: number;
  hint: string;
  accent?: "warn";
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-border bg-surface/60 px-4 py-4 hover:border-border-strong"
    >
      <p className="text-xs font-medium text-ink-faint">{label}</p>
      <p
        className={[
          "mt-1 text-2xl font-bold",
          accent === "warn" ? "text-warn" : "text-ink",
        ].join(" ")}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-ink-faint">{hint}</p>
    </Link>
  );
}

function TicketRow({
  id,
  summary,
  status,
}: {
  id: string;
  summary: string;
  status: string;
}) {
  return (
    <Link
      href={`/ticket/lista?id=${encodeURIComponent(id)}`}
      className="flex items-start gap-2 rounded-lg border border-border bg-base px-3 py-2 hover:border-border-strong"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{summary}</p>
        <p className="font-mono text-[11px] text-brand">#{id}</p>
      </div>
      <TicketStatusPill status={status} compact />
    </Link>
  );
}

function EmptyHint() {
  return (
    <p className="py-8 text-center text-xs text-ink-faint">
      Ancora nessun ticket. Creane uno o attendi un invio dal form.
    </p>
  );
}
