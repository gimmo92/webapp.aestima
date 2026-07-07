"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  TECHNICIAN_ASSIGNMENT_STATUSES,
} from "@/lib/technicianData";
import type {
  TechnicianAssignment,
  TechnicianAssignmentStatus,
} from "@/lib/technicianTypes";
import {
  TechnicianAssignmentStatusPill,
  CapabilityTags,
} from "./TechnicianBadges";
import { TechnicianContactButtons } from "./TechnicianContactButtons";

export function TechnicianAssignmentsTab() {
  const {
    technicianAssignments,
    technicians,
    requests,
    updateTechnicianAssignmentStatus,
  } = useInbox();
  const [statusFilter, setStatusFilter] = useState<
    TechnicianAssignmentStatus | "all"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    technicianAssignments[0]?.id ?? null
  );

  const techById = useMemo(
    () => Object.fromEntries(technicians.map((t) => [t.id, t])),
    [technicians]
  );
  const requestById = useMemo(
    () => Object.fromEntries(requests.map((r) => [r.id, r])),
    [requests]
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return technicianAssignments;
    return technicianAssignments.filter((a) => a.status === statusFilter);
  }, [technicianAssignments, statusFilter]);

  const selected =
    filtered.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: technicianAssignments.length };
    for (const s of TECHNICIAN_ASSIGNMENT_STATUSES) {
      m[s.id] = technicianAssignments.filter((a) => a.status === s.id).length;
    }
    return m;
  }, [technicianAssignments]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex w-full min-w-0 flex-col border-b border-border lg:w-[400px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Interventi assegnati</h2>
          <p className="text-xs text-ink-faint">
            {filtered.length} in vista · {technicianAssignments.length} totali
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label="Tutte"
              count={counts.all}
            />
            {TECHNICIAN_ASSIGNMENT_STATUSES.filter((s) =>
              ["contattato", "disponibile", "in_corso", "completato"].includes(s.id)
            ).map((s) => (
              <FilterChip
                key={s.id}
                active={statusFilter === s.id}
                onClick={() => setStatusFilter(s.id)}
                label={s.label}
                count={counts[s.id] ?? 0}
                color={s.color}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-faint">
              Nessuna assegnazione con questo filtro.
            </div>
          ) : (
            filtered.map((a) => {
              const tech = techById[a.technicianId];
              const req = requestById[a.partRequestId];
              const active = a.id === selected?.id;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={[
                    "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors",
                    active ? "bg-brand-soft" : "hover:bg-surface/70",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <TechnicianAssignmentStatusPill status={a.status} compact />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {tech?.name ?? "Tecnico"}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {a.assignedLabel}
                    </span>
                  </div>
                  <p className="truncate text-xs text-ink-faint">
                    {req?.company ?? "Cliente"} ·{" "}
                    {a.componentCode ?? a.machineSerial ?? "—"}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {selected ? (
          <AssignmentDetail
            assignment={selected}
            technicianName={techById[selected.technicianId]?.name ?? "—"}
            technician={techById[selected.technicianId]}
            clientCompany={requestById[selected.partRequestId]?.company ?? "—"}
            onChangeStatus={updateTechnicianAssignmentStatus}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            Seleziona un intervento per vedere il dettaglio.
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentDetail({
  assignment,
  technicianName,
  technician,
  clientCompany,
  onChangeStatus,
}: {
  assignment: TechnicianAssignment;
  technicianName: string;
  technician?: ReturnType<typeof useInbox>["technicians"][number];
  clientCompany: string;
  onChangeStatus: (id: string, status: TechnicianAssignmentStatus) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{assignment.subject}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            Tecnico: <span className="font-medium text-ink">{technicianName}</span>
          </p>
          <p className="text-xs text-ink-faint">
            Cliente: {clientCompany} · {assignment.assignedFull}
          </p>
          {technician && (
            <div className="mt-2">
              <CapabilityTags ids={technician.capabilities} max={4} />
            </div>
          )}
        </div>
        <TechnicianAssignmentStatusPill status={assignment.status} />
      </div>

      {(assignment.machineModel ||
        assignment.componentCode ||
        assignment.componentDescription) && (
        <div className="grid gap-3 rounded-xl border border-border bg-base/60 p-4 sm:grid-cols-2">
          {assignment.componentCode && (
            <Field label="Codice">
              <p className="font-mono text-sm text-brand">{assignment.componentCode}</p>
            </Field>
          )}
          {assignment.machineSerial && (
            <Field label="Matricola">
              <p className="text-sm text-ink">{assignment.machineSerial}</p>
            </Field>
          )}
          {assignment.componentDescription && (
            <Field label="Componente" className="sm:col-span-2">
              <p className="text-sm text-ink">{assignment.componentDescription}</p>
            </Field>
          )}
          {assignment.machineModel && (
            <Field label="Macchina">
              <p className="text-sm text-ink">{assignment.machineModel}</p>
            </Field>
          )}
        </div>
      )}

      <article className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Messaggio inviato
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-muted">
          {assignment.body}
        </pre>
      </article>

      {technician && (
        <div className="rounded-xl border border-border bg-base/60 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Contatta per disponibilità
          </p>
          <TechnicianContactButtons
            technician={technician}
            subject={assignment.subject}
            body={assignment.body}
            onContact={() => onChangeStatus(assignment.id, "contattato")}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <p className="w-full text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Aggiorna stato
        </p>
        {TECHNICIAN_ASSIGNMENT_STATUSES.filter((s) => s.id !== "bozza").map((s) => (
          <button
            key={s.id}
            onClick={() => onChangeStatus(assignment.id, s.id)}
            disabled={assignment.status === s.id}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-40"
          >
            {s.label}
          </button>
        ))}
      </div>

      <Link
        href="/"
        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
      >
        Apri richiesta in inbox
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

function Field({
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
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
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
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      {label}
      <span className="text-ink-faint">{count}</span>
    </button>
  );
}
