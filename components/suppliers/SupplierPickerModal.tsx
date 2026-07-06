"use client";

import { useMemo, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { Supplier } from "@/lib/supplierTypes";

// Modale per selezionare uno o più fornitori e inviare la bozza richiesta.

interface Props {
  body: string;
  subject: string;
  onClose: () => void;
  onSend: (supplierIds: string[]) => void;
}

export function SupplierPickerModal({ body, subject, onClose, onSend }: Props) {
  const { suppliers } = useInbox();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.categories.some((c) => c.toLowerCase().includes(q))
    );
  }, [suppliers, query]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="shrink-0 border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-ink">Seleziona fornitori</h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            Scegli a chi inviare la richiesta di disponibilità per il pezzo mancante.
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca fornitore, email o categoria…"
            className="mt-3 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-ink-faint">
              Nessun fornitore trovato. Aggiungine uno dalla tab Anagrafica.
            </p>
          ) : (
            filtered.map((s) => (
              <SupplierOption
                key={s.id}
                supplier={s}
                checked={selected.has(s.id)}
                onToggle={() => toggle(s.id)}
              />
            ))
          )}
        </div>

        <div className="shrink-0 border-t border-border px-5 py-3">
          <p className="mb-1 truncate text-xs text-ink-faint">
            Oggetto: <span className="text-ink-muted">{subject}</span>
          </p>
          <p className="mb-2 line-clamp-2 text-[11px] text-ink-faint">{body}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:text-ink"
            >
              Annulla
            </button>
            <button
              onClick={() => onSend([...selected])}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m4 12 15-8-6 16-3-6-6-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
              </svg>
              Invia a {selected.size || "…"} fornitor{selected.size === 1 ? "e" : "i"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupplierOption({
  supplier,
  checked,
  onToggle,
}: {
  supplier: Supplier;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={[
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        checked ? "bg-brand-soft" : "hover:bg-surface-2/60",
      ].join(" ")}
    >
      <span
        className={[
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
          checked ? "border-brand bg-brand" : "border-border-strong",
        ].join(" ")}
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-white">
            <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{supplier.name}</span>
        <span className="block text-xs text-ink-faint">{supplier.email}</span>
        {supplier.categories.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {supplier.categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-base px-1.5 py-0.5 text-[10px] text-ink-muted"
              >
                {c}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
