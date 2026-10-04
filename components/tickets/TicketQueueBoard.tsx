"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useInbox } from "@/components/inbox/InboxProvider";
import { userContactLabel } from "@/lib/companyUsers";
import { boardStages } from "@/lib/ticketData";
import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  isDepartmentId,
} from "@/lib/telephony/classify";
import type { DepartmentId } from "@/lib/telephony/classify";
import { TicketStatusPill } from "./TicketStatusPill";

export function TicketQueueBoard() {
  const {
    tickets,
    ticketStages,
    technicians,
    companyUsers,
    updateTicket,
    telephonyEnabled,
    ticketFieldLabels,
  } = useInbox();
  const router = useRouter();
  const columns = useMemo(() => boardStages(ticketStages), [ticketStages]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<
    DepartmentId | "all" | "none"
  >("all");

  const techById = useMemo(
    () => Object.fromEntries(technicians.map((t) => [t.id, t.name])),
    [technicians]
  );

  const visible = useMemo(() => {
    if (!telephonyEnabled || departmentFilter === "all") return tickets;
    return tickets.filter((ticket) =>
      departmentFilter === "none"
        ? !ticket.department
        : ticket.department === departmentFilter
    );
  }, [tickets, telephonyEnabled, departmentFilter]);

  const handleDrop = (stageId: string) => {
    if (!draggingId) return;
    const ticket = tickets.find((item) => item.id === draggingId);
    if (
      ticket &&
      stageId === "assegnato" &&
      !ticket.department &&
      !ticket.assignedTechnicianId
    ) {
      setDraggingId(null);
      setDragOver(null);
      return;
    }
    updateTicket(draggingId, { status: stageId });
    setDraggingId(null);
    setDragOver(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-surface/40 px-5 py-3">
        <h1 className="text-sm font-semibold text-ink">Coda ticket</h1>
        <p className="text-xs text-ink-faint">
          Trascina i ticket da {columns[0]?.label ?? "Da assegnare"} a{" "}
          {columns[columns.length - 1]?.label ?? "Risolto"}. Gli stage si
          personalizzano in Impostazioni.
          {telephonyEnabled
            ? " Assegnato richiede un tecnico oppure un reparto."
            : ""}
        </p>
        {telephonyEnabled && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            <QueueChip
              active={departmentFilter === "all"}
              label="Tutti i reparti"
              onClick={() => setDepartmentFilter("all")}
            />
            {DEPARTMENTS.map((id) => (
              <QueueChip
                key={id}
                active={departmentFilter === id}
                label={DEPARTMENT_LABELS[id]}
                onClick={() => setDepartmentFilter(id)}
              />
            ))}
            <QueueChip
              active={departmentFilter === "none"}
              label="Senza reparto"
              onClick={() => setDepartmentFilter("none")}
            />
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max gap-3 p-5">
          {columns.map((stage) => {
            const cards = visible.filter((t) => t.status === stage.id);
            const isOver = dragOver === stage.id;
            return (
              <div
                key={stage.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(stage.id);
                }}
                onDragLeave={() =>
                  setDragOver((s) => (s === stage.id ? null : s))
                }
                onDrop={() => handleDrop(stage.id)}
                className={[
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-surface/40 transition-colors",
                  isOver ? "border-brand bg-brand-soft/40" : "border-border",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="truncate text-sm font-semibold text-ink">
                      {stage.label}
                    </span>
                  </div>
                  <span className="rounded-full bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-faint">
                    {cards.length}
                  </span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {cards.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-ink-faint">
                      Trascina qui un ticket
                    </p>
                  ) : (
                    cards.map((t) => (
                      <article
                        key={t.id}
                        draggable
                        onDragStart={() => setDraggingId(t.id)}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setDragOver(null);
                        }}
                        onClick={() =>
                          router.push(
                            `/ticket/lista?id=${encodeURIComponent(t.id)}`
                          )
                        }
                        className={[
                          "cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm transition-all hover:border-border-strong active:cursor-grabbing",
                          draggingId === t.id ? "opacity-50" : "",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 text-sm font-semibold text-ink">
                            {t.summary}
                          </p>
                          <TicketStatusPill status={t.status} compact />
                        </div>
                        <p className="mt-1 font-mono text-[11px] text-brand">
                          #{t.id}
                        </p>
                        <p className="mt-1 truncate text-xs text-ink-muted">
                          {t.machineSerial ??
                            t.machineModel ??
                            `${ticketFieldLabels.machineModel} n/d`}
                        </p>
                        <p className="mt-2 text-[11px] text-ink-faint">
                          {telephonyEnabled &&
                          t.department &&
                          isDepartmentId(t.department)
                            ? `${DEPARTMENT_LABELS[t.department]} · `
                            : ""}
                          {t.assignedTechnicianId
                            ? userContactLabel(
                                companyUsers,
                                t.assignedTechnicianId,
                                techById[t.assignedTechnicianId]
                              ) || "Assegnato"
                            : "Non assegnato"}{" "}
                          · {t.createdLabel}
                        </p>
                      </article>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QueueChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-2 py-0.5 text-[11px] font-medium",
        active
          ? "border-brand/50 bg-brand-soft text-ink"
          : "border-border bg-base text-ink-muted hover:border-border-strong",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
