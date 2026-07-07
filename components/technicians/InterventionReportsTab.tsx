"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { InterventionReport } from "@/lib/technicianTypes";
import {
  InterventionReportOutcomePill,
  InterventionReportTypePill,
} from "./TechnicianBadges";

export function InterventionReportsTab() {
  const { interventionReports, technicians } = useInbox();
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(
    interventionReports[0]?.id ?? null
  );

  const techById = useMemo(
    () => Object.fromEntries(technicians.map((t) => [t.id, t])),
    [technicians]
  );

  const machines = useMemo(() => {
    const map = new Map<string, { serial: string; model: string; count: number }>();
    for (const r of interventionReports) {
      const prev = map.get(r.machineSerial);
      map.set(r.machineSerial, {
        serial: r.machineSerial,
        model: r.machineModel,
        count: (prev?.count ?? 0) + 1,
      });
    }
    return [...map.values()].sort((a, b) => a.serial.localeCompare(b.serial));
  }, [interventionReports]);

  const filtered = useMemo(() => {
    const list =
      machineFilter === "all"
        ? interventionReports
        : interventionReports.filter((r) => r.machineSerial === machineFilter);
    return [...list].sort((a, b) =>
      b.interventionDate.localeCompare(a.interventionDate, "it")
    );
  }, [interventionReports, machineFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, InterventionReport[]>();
    for (const r of filtered) {
      const arr = map.get(r.machineSerial) ?? [];
      arr.push(r);
      map.set(r.machineSerial, arr);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const selected =
    filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <div className="flex w-full min-w-0 flex-col border-b border-border lg:w-[420px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Rapporti intervento</h2>
          <p className="text-xs text-ink-faint">
            {filtered.length} rapporti · {machines.length} macchine
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <FilterChip
              active={machineFilter === "all"}
              onClick={() => setMachineFilter("all")}
              label="Tutte le macchine"
              count={interventionReports.length}
            />
            {machines.map((m) => (
              <FilterChip
                key={m.serial}
                active={machineFilter === m.serial}
                onClick={() => setMachineFilter(m.serial)}
                label={m.serial}
                count={m.count}
              />
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-faint">
              Nessun rapporto per questa macchina.
            </div>
          ) : (
            grouped.map(([serial, reports]) => (
              <div key={serial}>
                <div className="sticky top-0 z-10 border-b border-border/80 bg-surface/95 px-4 py-2 backdrop-blur-sm">
                  <p className="text-xs font-semibold text-ink">{reports[0].machineModel}</p>
                  <p className="font-mono text-[11px] text-brand">{serial}</p>
                </div>
                {reports.map((r) => {
                  const active = r.id === selected?.id;
                  const tech = techById[r.technicianId];
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className={[
                        "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors",
                        active ? "bg-brand-soft" : "hover:bg-surface/70",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <InterventionReportTypePill type={r.type} compact />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                          {r.reportNumber}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-faint">
                          {r.interventionDate}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-ink-muted">{r.summary}</p>
                      <p className="text-[11px] text-ink-faint">
                        {tech?.name ?? "Tecnico"} · {r.hours} h
                      </p>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {selected ? (
          <ReportDetail report={selected} technicianName={techById[selected.technicianId]?.name ?? "—"} />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            Seleziona un rapporto per vedere il dettaglio.
          </div>
        )}
      </div>
    </div>
  );
}

function ReportDetail({
  report,
  technicianName,
}: {
  report: InterventionReport;
  technicianName: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-ink">{report.reportNumber}</h2>
            <InterventionReportTypePill type={report.type} />
            <InterventionReportOutcomePill outcome={report.outcome} />
          </div>
          <p className="mt-1 text-sm text-ink-muted">{report.summary}</p>
          <p className="text-xs text-ink-faint">{report.interventionDateFull}</p>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-base/60 p-4 sm:grid-cols-2">
        <Field label="Macchina">
          <p className="text-sm font-medium text-ink">{report.machineModel}</p>
          <p className="font-mono text-xs text-brand">{report.machineSerial}</p>
        </Field>
        <Field label="Tecnico">
          <p className="text-sm text-ink">{technicianName}</p>
          <p className="text-xs text-ink-faint">{report.hours} ore uomo</p>
        </Field>
        {report.customerCompany && (
          <Field label="Cliente" className="sm:col-span-2">
            <p className="text-sm text-ink">{report.customerCompany}</p>
          </Field>
        )}
      </div>

      <article className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Lavori eseguiti
        </p>
        <p className="text-sm leading-relaxed text-ink-muted">{report.workPerformed}</p>
      </article>

      {report.partsUsed && report.partsUsed.length > 0 && (
        <div className="rounded-xl border border-border bg-base/60 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Ricambi utilizzati
          </p>
          <div className="flex flex-wrap gap-1.5">
            {report.partsUsed.map((code) => (
              <span
                key={code}
                className="rounded-md border border-border bg-surface px-2 py-1 font-mono text-xs text-brand"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/archivio?q=${encodeURIComponent(report.machineSerial)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-brand/50 hover:text-brand"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
          </svg>
          Documenti macchina in archivio
        </Link>
      </div>
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
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
      {label}
      <span className="text-ink-faint">{count}</span>
    </button>
  );
}
