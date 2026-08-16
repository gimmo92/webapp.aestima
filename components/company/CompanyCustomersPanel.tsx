"use client";

import { useMemo, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { Customer, CustomerInput } from "@/lib/customerTypes";
import { Field, inputClass } from "./formFields";

const EMPTY: CustomerInput = {
  name: "",
  contactName: "",
  email: "",
  phone: "",
  vat: "",
  city: "",
  address: "",
  notes: "",
};

export function CompanyCustomersPanel({ canManage }: { canManage: boolean }) {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useInbox();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Customer | "new" | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.name, c.contactName, c.email, c.phone, c.vat, c.city]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q))
    );
  }, [customers, query]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="text-sm font-semibold text-ink">Clienti</h1>
          <p className="text-xs text-ink-faint">
            {customers.length}{" "}
            {customers.length === 1 ? "cliente" : "clienti"} in anagrafica
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca ragione sociale, P.IVA, città…"
            className="w-64 rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          {canManage && (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Aggiungi cliente
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
              <th className="px-5 py-3 font-semibold">P.IVA</th>
              <th className="px-5 py-3 font-semibold">Città</th>
              {canManage && <th className="px-5 py-3 font-semibold">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-surface-2/40">
                <td className="px-5 py-3">
                  <p className="font-medium text-ink">{c.name}</p>
                  {c.notes && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-ink-faint">{c.notes}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-ink-muted">{c.contactName || "—"}</td>
                <td className="px-5 py-3 text-ink-muted">
                  <div>{c.email || "—"}</div>
                  {c.phone && <div className="text-xs text-ink-faint">{c.phone}</div>}
                </td>
                <td className="px-5 py-3 font-mono text-xs text-ink-muted">
                  {c.vat || "—"}
                </td>
                <td className="px-5 py-3 text-ink-muted">{c.city || "—"}</td>
                {canManage && (
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditing(c)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Modifica
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Eliminare ${c.name}?`)) {
                            deleteCustomer(c.id);
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
            {customers.length === 0
              ? "Nessun cliente in anagrafica."
              : "Nessun cliente corrisponde alla ricerca."}
          </p>
        )}
      </div>

      {editing && (
        <CustomerFormModal
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            if (editing === "new") addCustomer(input);
            else updateCustomer(editing.id, input);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function CustomerFormModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  onClose: () => void;
  onSave: (input: CustomerInput) => void;
}) {
  const [form, setForm] = useState<CustomerInput>(() =>
    customer
      ? {
          name: customer.name,
          contactName: customer.contactName ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          vat: customer.vat ?? "",
          city: customer.city ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
        }
      : EMPTY
  );

  const set = (key: keyof CustomerInput, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const save = () => {
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      contactName: form.contactName?.trim() || undefined,
      email: form.email?.trim() || undefined,
      phone: form.phone?.trim() || undefined,
      vat: form.vat?.trim() || undefined,
      city: form.city?.trim() || undefined,
      address: form.address?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
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
            {customer ? "Modifica cliente" : "Aggiungi cliente"}
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
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
                placeholder="Cartonificio Alpino S.p.A."
              />
            </Field>
          </div>
          <Field label="Referente">
            <input
              value={form.contactName ?? ""}
              onChange={(e) => set("contactName", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="P.IVA">
            <input
              value={form.vat ?? ""}
              onChange={(e) => set("vat", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Telefono">
            <input
              value={form.phone ?? ""}
              onChange={(e) => set("phone", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Città">
            <input
              value={form.city ?? ""}
              onChange={(e) => set("city", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Indirizzo">
            <input
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Note">
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
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
            disabled={!form.name.trim()}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
          >
            Salva
          </button>
        </div>
      </div>
    </div>
  );
}
