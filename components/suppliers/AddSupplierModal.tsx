"use client";

import { useState } from "react";
import type { SupplierInput } from "@/lib/supplierTypes";

interface Props {
  onClose: () => void;
  onSave: (input: SupplierInput) => void;
}

export function AddSupplierModal({ onClose, onSave }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [categories, setCategories] = useState("");
  const [notes, setNotes] = useState("");

  const save = () => {
    if (!name.trim() || !email.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim(),
      contact: contact.trim() || undefined,
      categories: categories
        .split(/[;,]/)
        .map((c) => c.trim())
        .filter(Boolean),
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-ink">Aggiungi fornitore</h3>
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
        <div className="space-y-3 p-5">
          <Field label="Ragione sociale *">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Meccanica Nord S.r.l."
            />
          </Field>
          <Field label="Email *">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="ordini@fornitore.it"
            />
          </Field>
          <Field label="Referente">
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Marco Ferretti"
            />
          </Field>
          <Field label="Categorie (separate da ; )">
            <input
              value={categories}
              onChange={(e) => setCategories(e.target.value)}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              placeholder="Pneumatica; Valvole"
            />
          </Field>
          <Field label="Note">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:text-ink"
          >
            Annulla
          </button>
          <button
            onClick={save}
            disabled={!name.trim() || !email.trim()}
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
