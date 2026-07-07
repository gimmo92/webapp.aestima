"use client";

import { useMemo, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  CAPABILITY_BY_ID,
  sortTechniciansByMatch,
} from "@/lib/technicianData";
import type { PartRequest } from "@/lib/inboxTypes";
import type { Technician } from "@/lib/technicianTypes";
import { CapabilityTags } from "./TechnicianBadges";
import { TechnicianContactButtons } from "./TechnicianContactButtons";

interface Props {
  request: PartRequest;
  subject: string;
  body: string;
  suggestedCapabilityIds?: string[];
  machineModel?: string;
  machineSerial?: string;
  componentCode?: string;
  componentDescription?: string;
  onClose: () => void;
  onAssign: (technicianId: string, contacted: boolean) => void;
}

export function TechnicianPickerModal({
  request,
  subject,
  body: initialBody,
  suggestedCapabilityIds = [],
  onClose,
  onAssign,
}: Props) {
  const { technicians } = useInbox();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState(initialBody);
  const [contacted, setContacted] = useState(false);

  const sorted = useMemo(
    () => sortTechniciansByMatch(technicians, suggestedCapabilityIds),
    [technicians, suggestedCapabilityIds]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.region?.toLowerCase().includes(q) ||
        t.capabilities.some((c) =>
          (CAPABILITY_BY_ID[c]?.label ?? c).toLowerCase().includes(q)
        )
    );
  }, [sorted, query]);

  const selected = technicians.find((t) => t.id === selectedId) ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-ink">Assegna a un tecnico</h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            Richiesta: {request.company} — contattalo per verificare la disponibilità
            all&apos;intervento.
          </p>
          {suggestedCapabilityIds.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                Capacità suggerite
              </span>
              <CapabilityTags ids={suggestedCapabilityIds} max={4} />
            </div>
          )}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca tecnico, zona o capacità…"
            className="mt-3 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </div>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-2">
          <div className="min-h-0 overflow-y-auto border-b border-border p-2 lg:border-b-0 lg:border-r">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink-faint">
                Nessun tecnico trovato.
              </p>
            ) : (
              filtered.map((t) => (
                <TechnicianOption
                  key={t.id}
                  technician={t}
                  checked={selectedId === t.id}
                  suggested={t.capabilities.some((c) =>
                    suggestedCapabilityIds.includes(c)
                  )}
                  onSelect={() => setSelectedId(t.id)}
                />
              ))
            )}
          </div>

          <div className="flex min-h-0 flex-col p-4">
            {selected ? (
              <>
                <p className="text-sm font-semibold text-ink">{selected.name}</p>
                <p className="text-xs text-ink-faint">
                  {selected.region ?? "—"} · {selected.email}
                </p>
                <CapabilityTags ids={selected.capabilities} max={5} />
                <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Messaggio precompilato
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={8}
                  className="mt-1 min-h-0 flex-1 resize-none rounded-lg border border-border bg-base px-3 py-2 text-sm leading-relaxed text-ink outline-none focus:border-brand"
                />
                <TechnicianContactButtons
                  technician={selected}
                  subject={subject}
                  body={message}
                  onContact={() => setContacted(true)}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-ink-faint">
                Seleziona un tecnico dalla lista.
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-ink-faint">
              {contacted
                ? "Contatto avviato — conferma l'assegnazione per tracciarla."
                : "Usa WhatsApp o email, poi conferma l'assegnazione."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:text-ink"
              >
                Annulla
              </button>
              <button
                onClick={() => selectedId && onAssign(selectedId, contacted)}
                disabled={!selectedId || !message.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
              >
                Conferma assegnazione
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechnicianOption({
  technician,
  checked,
  suggested,
  onSelect,
}: {
  technician: Technician;
  checked: boolean;
  suggested: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        checked ? "bg-brand-soft" : "hover:bg-surface-2/60",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-brand bg-brand" : "border-border-strong",
        ].join(" ")}
      >
        {checked && (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{technician.name}</span>
          {suggested && (
            <span className="rounded-full bg-ok/15 px-1.5 py-0.5 text-[9px] font-semibold text-ok">
              adatto
            </span>
          )}
        </span>
        <span className="block text-xs text-ink-faint">
          {technician.region ?? technician.email}
        </span>
        <span className="mt-1 block">
          <CapabilityTags ids={technician.capabilities} max={2} />
        </span>
      </span>
    </button>
  );
}
