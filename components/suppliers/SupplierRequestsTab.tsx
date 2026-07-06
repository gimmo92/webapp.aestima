"use client";

import { useMemo, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import { SUPPLIER_REQUEST_STATUSES } from "@/lib/supplierData";
import type { SupplierRequest, SupplierRequestStatus } from "@/lib/supplierTypes";
import { SupplierRequestStatusPill } from "./SupplierRequestStatusPill";

// Tab iniziale Fornitori: richieste inviate ai fornitori con stato.

export function SupplierRequestsTab() {
  const { supplierRequests, suppliers, requests, updateSupplierRequestStatus } =
    useInbox();
  const [statusFilter, setStatusFilter] = useState<SupplierRequestStatus | "all">(
    "all"
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    supplierRequests[0]?.id ?? null
  );

  const supplierById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s])),
    [suppliers]
  );
  const requestById = useMemo(
    () => Object.fromEntries(requests.map((r) => [r.id, r])),
    [requests]
  );

  const filtered = useMemo(() => {
    if (statusFilter === "all") return supplierRequests;
    return supplierRequests.filter((sr) => sr.status === statusFilter);
  }, [supplierRequests, statusFilter]);

  const selected = filtered.find((sr) => sr.id === selectedId) ?? filtered[0] ?? null;

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: supplierRequests.length };
    for (const s of SUPPLIER_REQUEST_STATUSES) {
      m[s.id] = supplierRequests.filter((sr) => sr.status === s.id).length;
    }
    return m;
  }, [supplierRequests]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Lista */}
      <div className="flex w-full min-w-0 flex-col border-b border-border lg:w-[400px] lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Richieste inviate</h2>
          <p className="text-xs text-ink-faint">
            {filtered.length} in vista · {supplierRequests.length} totali
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
              label="Tutte"
              count={counts.all}
            />
            {SUPPLIER_REQUEST_STATUSES.filter((s) =>
              ["inviata", "in_attesa", "risposta_ricevuta", "confermata"].includes(s.id)
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
              Nessuna richiesta con questo filtro.
            </div>
          ) : (
            filtered.map((sr) => {
              const sup = supplierById[sr.supplierId];
              const part = requestById[sr.partRequestId];
              const active = sr.id === selected?.id;
              return (
                <button
                  key={sr.id}
                  onClick={() => setSelectedId(sr.id)}
                  className={[
                    "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors",
                    active ? "bg-brand-soft" : "hover:bg-surface/70",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <SupplierRequestStatusPill status={sr.status} compact />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {sup?.name ?? "Fornitore"}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-faint">
                      {sr.sentLabel}
                    </span>
                  </div>
                  <p className="truncate font-mono text-xs text-brand">
                    {sr.componentCode}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    {part?.company ?? "Cliente"} · {sr.machineSerial}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Dettaglio */}
      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {selected ? (
          <RequestDetail
            sr={selected}
            supplierName={supplierById[selected.supplierId]?.name ?? "—"}
            supplierEmail={supplierById[selected.supplierId]?.email ?? "—"}
            clientCompany={requestById[selected.partRequestId]?.company ?? "—"}
            onChangeStatus={updateSupplierRequestStatus}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            Seleziona una richiesta per vedere il dettaglio.
          </div>
        )}
      </div>
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

function RequestDetail({
  sr,
  supplierName,
  supplierEmail,
  clientCompany,
  onChangeStatus,
}: {
  sr: SupplierRequest;
  supplierName: string;
  supplierEmail: string;
  clientCompany: string;
  onChangeStatus: (id: string, status: SupplierRequestStatus) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">{sr.subject}</h2>
          <p className="mt-0.5 text-sm text-ink-muted">
            A: <span className="font-medium text-ink">{supplierName}</span> ·{" "}
            {supplierEmail}
          </p>
          <p className="text-xs text-ink-faint">
            Cliente: {clientCompany} · {sr.sentFull}
          </p>
        </div>
        <SupplierRequestStatusPill status={sr.status} />
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-base/60 p-4 sm:grid-cols-2">
        <Field label="Codice ricambio">
          <p className="font-mono text-sm text-brand">{sr.componentCode}</p>
        </Field>
        <Field label="Matricola">
          <p className="text-sm text-ink">{sr.machineSerial}</p>
        </Field>
        <Field label="Componente" className="sm:col-span-2">
          <p className="text-sm text-ink">{sr.componentDescription}</p>
        </Field>
        <Field label="Macchina">
          <p className="text-sm text-ink">{sr.machineModel}</p>
        </Field>
      </div>

      <article className="rounded-xl border border-border bg-base/60 p-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Testo inviato
        </p>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink-muted">
          {sr.body}
        </pre>
      </article>

      <div className="flex flex-wrap gap-2">
        <p className="w-full text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Aggiorna stato
        </p>
        {SUPPLIER_REQUEST_STATUSES.filter((s) => s.id !== "bozza").map((s) => (
          <button
            key={s.id}
            onClick={() => onChangeStatus(sr.id, s.id)}
            disabled={sr.status === s.id}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-40"
          >
            {s.label}
          </button>
        ))}
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
