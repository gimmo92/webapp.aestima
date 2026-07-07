"use client";

import { useRef, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import { parseTechnicianFile } from "@/lib/parseTechnicianFile";
import { INTERVENTION_CAPABILITIES } from "@/lib/technicianData";
import { CapabilityTags } from "./TechnicianBadges";
import { AddTechnicianModal } from "./AddTechnicianModal";

export function TechnicianDirectoryTab() {
  const { technicians, addTechnician, addTechnicians } = useInbox();
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
      const rows = await parseTechnicianFile(file);
      const count = addTechnicians(rows);
      setImportMsg(
        count > 0
          ? `Importati ${count} tecnici da ${file.name}.`
          : `Nessun tecnico valido in ${file.name}. Verifica colonne nome, email e telefono.`
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
          <h2 className="text-sm font-semibold text-ink">Tecnici per capacità di intervento</h2>
          <p className="text-xs text-ink-faint">
            {technicians.length} tecnici · raggruppati per tipologia
          </p>
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
            Aggiungi tecnico
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
        <span className="font-mono">email</span>,{" "}
        <span className="font-mono">telefono</span>, opzionali{" "}
        <span className="font-mono">capacita</span> (separate da ;),{" "}
        <span className="font-mono">regione</span>, <span className="font-mono">note</span>.
        File .csv o .xlsx.
      </p>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          {INTERVENTION_CAPABILITIES.map((cap) => {
            const list = technicians.filter((t) => t.capabilities.includes(cap.id));
            if (list.length === 0) return null;

            return (
              <section
                key={cap.id}
                className="overflow-hidden rounded-xl border border-border bg-base/50"
              >
                <div
                  className="flex items-center justify-between gap-3 border-b border-border px-4 py-3"
                  style={{ backgroundColor: `${cap.color}08` }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cap.color }}
                    />
                    <h3 className="text-sm font-semibold text-ink">{cap.label}</h3>
                  </div>
                  <span className="text-[11px] font-semibold tabular-nums text-ink-faint">
                    {list.length} tecnici
                  </span>
                </div>
                <ul className="divide-y divide-border/70">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">{t.name}</p>
                        <p className="text-xs text-ink-faint">
                          {t.region ?? "—"} · {t.email} · {t.phone}
                        </p>
                        {t.notes && (
                          <p className="mt-1 text-[11px] text-ink-muted">{t.notes}</p>
                        )}
                      </div>
                      <CapabilityTags ids={t.capabilities} max={4} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {technicians.filter((t) => t.capabilities.length === 0).length > 0 && (
            <section className="overflow-hidden rounded-xl border border-border bg-base/50">
              <div className="border-b border-border px-4 py-3">
                <h3 className="text-sm font-semibold text-ink">Senza capacità assegnate</h3>
              </div>
              <ul className="divide-y divide-border/70">
                {technicians
                  .filter((t) => t.capabilities.length === 0)
                  .map((t) => (
                    <li key={t.id} className="px-4 py-3">
                      <p className="text-sm font-medium text-ink">{t.name}</p>
                      <p className="text-xs text-ink-faint">{t.email}</p>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      {showAdd && (
        <AddTechnicianModal
          onClose={() => setShowAdd(false)}
          onSave={(input) => {
            addTechnician(input);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
