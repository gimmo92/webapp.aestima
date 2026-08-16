"use client";

import { useMemo, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { Supplier, SupplierInput } from "@/lib/supplierTypes";
import { Field, inputClass } from "./formFields";

const EMPTY: SupplierInput = {
  name: "",
  email: "",
  contact: "",
  phone: "",
  categories: [],
  notes: "",
};

export function CompanySuppliersPanel({ canManage }: { canManage: boolean }) {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useInbox();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Supplier | "new" | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter((s) =>
      [s.name, s.email, s.contact, s.phone, s.notes, ...(s.categories ?? [])]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [suppliers, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="text-sm font-semibold text-ink">Fornitori</h1>
          <p className="text-xs text-ink-faint">
            {suppliers.length}{" "}
            {suppliers.length === 1 ? "fornitore" : "fornitori"} in anagrafica
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca nome, email, categoria…"
            className="w-64 rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Aggiungi fornitore
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="sticky top-0 bg-surface/90 text-[11px] uppercase tracking-wider text-ink-faint backdrop-blur">
            <tr>
              <th className="px-5 py-3 font-semibold">Ragione sociale</th>
              <th className="px-5 py-3 font-semibold">Referente</th>
              <th className="px-5 py-3 font-semibold">Contatti</th>
              <th className="px-5 py-3 font-semibold">Categorie</th>
              {canManage && <th className="px-5 py-3 font-semibold">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-surface-2/40">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{s.name}</p>
                  {s.notes && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{s.notes}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-ink-muted">{s.contact || "—"}</td>
                <td className="px-5 py-3 text-ink-muted">
                  <div>{s.email}</div>
                  {s.phone && <div className="text-xs text-ink-faint">{s.phone}</div>}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.categories.length === 0 && (
                      <span className="text-ink-faint">—</span>
                    )}
                    {s.categories.map((cat) => (
                      <span
                        key={cat}
                        className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-ink-muted"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </td>
                {canManage && (
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Eliminare ${s.name}?`)) {
                            deleteSupplier(s.id);
                          }
                        }}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            {suppliers.length === 0
              ? "Nessun fornitore in anagrafica."
              : "Nessun fornitore corrisponde alla ricerca."}
          </p>
        )}
      </div>

      {editing && (
        <SupplierFormModal
          supplier={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            if (editing === "new") addSupplier(input);
            else updateSupplier(editing.id, input);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function SupplierFormModal({
  supplier,
  onClose,
  onSave,
}: {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (input: SupplierInput) => void;
}) {
  const [form, setForm] = useState(() =>
    supplier
      ? {
          name: supplier.name,
          email: supplier.email,
          contact: supplier.contact ?? "",
          phone: supplier.phone ?? "",
          categories: supplier.categories.join("; "),
          notes: supplier.notes ?? "",
        }
      : {
          name: EMPTY.name,
          email: EMPTY.email,
          contact: "",
          phone: "",
          categories: "",
          notes: "",
        }
  );

  const save = () => {
    if (!form.name.trim() || !form.email.trim()) return;
    onSave({
      name: form.name.trim(),
      email: form.email.trim(),
      contact: form.contact.trim() || undefined,
      phone: form.phone.trim() || undefined,
      categories: form.categories
        .split(/[;,]/)
        .map((c) => c.trim())
        .filter(Boolean),
      notes: form.notes.trim() || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-ink">
            {supplier ? "Modifica fornitore" : "Aggiungi fornitore"}
          </h3>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink">
            Chiudi
          </button>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Ragione sociale *">
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={inputClass}
                placeholder="Meccanica Nord S.r.l."
              />
            </Field>
          </div>
          <Field label="Email *">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Telefono">
            <input
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Referente">
            <input
              value={form.contact}
              onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="Categorie (separate da ; )">
            <input
              value={form.categories}
              onChange={(e) => setForm((p) => ({ ...p, categories: e.target.value }))}
              className={inputClass}
              placeholder="Pneumatica; Valvole"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note">
              <textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:text-ink"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!form.name.trim() || !form.email.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
