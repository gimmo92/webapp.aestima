"use client";

import { useRef, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import { parseSupplierFile } from "@/lib/parseSupplierFile";
import type { Supplier } from "@/lib/supplierTypes";
import { AddSupplierModal } from "./AddSupplierModal";

// Anagrafica fornitori: lista, aggiunta manuale, import CSV/Excel.

export function SupplierDirectoryTab() {
  const { suppliers, addSupplier, addSuppliers } = useInbox();
  const [showAdd, setShowAdd] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    setBusy(true);
    setImportMsg(null);
    setImportErr(null);
    try {
      const rows = await parseSupplierFile(file);
      const count = addSuppliers(rows);
      setImportMsg(
        count > 0
          ? `Importati ${count} fornitori da ${file.name}.`
          : `Nessun fornitore valido trovato in ${file.name}. Verifica colonne nome e email.`
      );
    } catch (e) {
      setImportErr(e instanceof Error ? e.message : "Errore durante l'import.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Anagrafica fornitori</h2>
          <p className="text-xs text-ink-faint">{suppliers.length} fornitori in rubrica</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {busy ? "Importo…" : "Carica Excel/CSV"}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Aggiungi fornitore
          </button>
        </div>
      </div>

      {(importMsg || importErr) && (
        <div
          className={[
            "mx-5 mt-3 rounded-lg border px-3 py-2 text-sm",
            importErr
              ? "border-warn/40 bg-warn/10 text-warn"
              : "border-ok/40 bg-ok/10 text-ok",
          ].join(" ")}
        >
          {importErr ?? importMsg}
        </div>
      )}

      <p className="px-5 pt-3 text-[11px] text-ink-faint">
        Import: colonne <span className="font-mono">nome</span>,{" "}
        <span className="font-mono">email</span>, opzionali{" "}
        <span className="font-mono">referente</span>,{" "}
        <span className="font-mono">categorie</span> (separate da ;). File .csv o .xlsx.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/80 text-[11px] uppercase tracking-wider text-ink-faint">
                <th className="px-4 py-2.5 font-semibold">Fornitore</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Referente</th>
                <th className="px-4 py-2.5 font-semibold">Categorie</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <SupplierRow key={s.id} supplier={s} />
              ))}
            </tbody>
          </table>
          {suppliers.length === 0 && (
            <p className="p-8 text-center text-sm text-ink-faint">
              Nessun fornitore. Aggiungine uno o importa da file.
            </p>
          )}
        </div>
      </div>

      {showAdd && (
        <AddSupplierModal
          onClose={() => setShowAdd(false)}
          onSave={(input) => {
            addSupplier(input);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function SupplierRow({ supplier }: { supplier: Supplier }) {
  return (
    <tr className="border-b border-border/60 transition-colors hover:bg-surface/50">
      <td className="px-4 py-3 font-medium text-ink">{supplier.name}</td>
      <td className="px-4 py-3 text-ink-muted">{supplier.email}</td>
      <td className="px-4 py-3 text-ink-muted">{supplier.contact ?? "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {supplier.categories.length > 0 ? (
            supplier.categories.map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] text-ink-muted"
              >
                {c}
              </span>
            ))
          ) : (
            <span className="text-ink-faint">—</span>
          )}
        </div>
      </td>
    </tr>
  );
}
