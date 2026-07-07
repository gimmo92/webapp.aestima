"use client";

import { useState } from "react";
import { INTERVENTION_CAPABILITIES } from "@/lib/technicianData";
import type { TechnicianInput } from "@/lib/technicianTypes";

interface Props {
  onClose: () => void;
  onSave: (input: TechnicianInput) => void;
}

export function AddTechnicianModal({ onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState("");
  const [notes, setNotes] = useState("");
  const [capabilities, setCapabilities] = useState<Set<string>>(new Set());

  const toggleCap = (id: string) => {
    setCapabilities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const save = () => {
    if (!name.trim() || !email.trim() || !phone.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim(),
      phone: phone.replace(/\D/g, "").replace(/^0/, "39"),
      capabilities: [...capabilities],
      region: region.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-ink">Aggiungi tecnico</h3>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="text-ink-faint hover:text-ink"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          <Field label="Nome e cognome *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Luca Moretti"
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="l.moretti@aestima.demo"
            />
          </Field>
          <Field label="Telefono WhatsApp *">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="393471234567"
            />
          </Field>
          <Field label="Zona / regione">
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Veneto · Nord-Est"
            />
          </Field>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Capacità di intervento
            </p>
            <div className="flex flex-wrap gap-1.5">
              {INTERVENTION_CAPABILITIES.map((cap) => {
                const on = capabilities.has(cap.id);
                return (
                  <button
                    key={cap.id}
                    type="button"
                    onClick={() => toggleCap(cap.id)}
                    className={[
                      "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                      on
                        ? "border-brand/50 bg-brand-soft text-ink"
                        : "border-border bg-base text-ink-muted hover:border-border-strong",
                    ].join(" ")}
                    style={on ? { borderColor: `${cap.color}60`, color: cap.color } : undefined}
                  >
                    {cap.label}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Note">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </Field>
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:text-ink"
          >
            Annulla
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || !email.trim() || !phone.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </label>
      {children}
    </div>
  );
}
