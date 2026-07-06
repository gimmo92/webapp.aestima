"use client";

import { useMemo } from "react";
import { DOC_TYPES, machineLabel } from "@/lib/archiveData";
import type { ArchivedDoc, DocType } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";
import { DocTypeBadge } from "./DocTypeBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

// VISTA ARCHIVIO ORGANIZZATO — documenti raggruppati per Macchina e,
// dentro ogni macchina, per tipo. Con barra di ricerca (interrogabile).

const TYPE_ORDER: DocType[] = [
  "disegno",
  "distinta",
  "catalogo",
  "manuale",
  "offerta",
  "foto",
];

interface Props {
  docs: ArchivedDoc[];
  query: string;
  onQueryChange: (q: string) => void;
}

export function OrganizedArchive({ docs, query, onQueryChange }: Props) {
  // Filtro di ricerca su nome, codice, tipo, macchina.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const hay = [
        d.file.name,
        d.codice ?? "",
        DOC_TYPES[d.tipo].label,
        machineLabel(d.macchinaSerial),
        d.revisione ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [docs, query]);

  // Raggruppa per macchina.
  const byMachine = useMemo(() => {
    const map = new Map<string, ArchivedDoc[]>();
    for (const d of filtered) {
      const arr = map.get(d.macchinaSerial) ?? [];
      arr.push(d);
      map.set(d.macchinaSerial, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-surface/50">
      {/* Header + ricerca */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Archivio organizzato
          </div>
          <span className="shrink-0 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
            Dopo · interrogabile
          </span>
        </div>
        <div className="relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cerca un ricambio, una macchina, un codice…"
            className="w-full rounded-lg border border-border bg-base py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      {/* Contenuto */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {byMachine.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-faint">
            Nessun documento corrisponde alla ricerca.
          </div>
        ) : (
          byMachine.map(([serial, machineDocs]) => (
            <MachineGroup key={serial} serial={serial} docs={machineDocs} />
          ))
        )}
      </div>
    </section>
  );
}

function MachineGroup({ serial, docs }: { serial: string; docs: ArchivedDoc[] }) {
  // Ordina i documenti per tipo secondo TYPE_ORDER.
  const byType = TYPE_ORDER.map((tipo) => ({
    tipo,
    items: docs.filter((d) => d.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-base/50">
      {/* Intestazione macchina */}
      <div className="flex items-center gap-2.5 border-b border-border bg-surface-2/40 px-4 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-soft">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
            <path d="M4 20V10l6-3 6 3v10M4 20h16M9 20v-4h2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {machineLabel(serial)}
          </p>
          <p className="text-[11px] text-ink-faint">
            {docs.length} documenti collegati
          </p>
        </div>
      </div>

      {/* Documenti per tipo */}
      <div className="space-y-3 p-3">
        {byType.map((group) => (
          <div key={group.tipo}>
            <div className="mb-1.5 flex items-center gap-2">
              <DocTypeBadge tipo={group.tipo} />
              <span className="text-[11px] text-ink-faint">
                {group.items.length}
              </span>
            </div>
            <div className="space-y-1">
              {group.items.map((d) => (
                <div
                  key={d.file.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-2.5 py-1.5"
                >
                  <FileIcon ext={d.file.ext} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-ink">{d.file.name}</p>
                    <p className="truncate text-[11px] text-ink-faint">
                      {[
                        d.codice ? `Cod. ${d.codice}` : null,
                        d.revisione ? `Rev. ${d.revisione}` : null,
                        d.data ?? null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Metadati estratti"}
                    </p>
                  </div>
                  <ConfidenceBadge confidence={d.confidence} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
