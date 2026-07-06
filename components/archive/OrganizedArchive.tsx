"use client";

import { useMemo } from "react";
import {
  DOC_TYPES,
  FILE_EXT_LABELS,
  docYear,
  machineCategory,
  machineLabel,
} from "@/lib/archiveData";
import type { ArchivedDoc, DocType, FileExt } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";
import { DocTypeBadge } from "./DocTypeBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";

// VISTA ARCHIVIO ORGANIZZATO — raggruppamento configurabile:
// per tipo macchina (default), tipo documento, tipo file o anno.

export type ArchiveViewMode = "macchina" | "documento" | "file" | "anno";

const TYPE_ORDER: DocType[] = [
  "disegno",
  "distinta",
  "catalogo",
  "manuale",
  "offerta",
  "foto",
];

const VIEW_MODES: { id: ArchiveViewMode; label: string }[] = [
  { id: "macchina", label: "Tipo macchina" },
  { id: "documento", label: "Tipo documento" },
  { id: "file", label: "Tipo file" },
  { id: "anno", label: "Anno" },
];

interface Props {
  docs: ArchivedDoc[];
  query: string;
  onQueryChange: (q: string) => void;
  viewMode: ArchiveViewMode;
  onViewModeChange: (mode: ArchiveViewMode) => void;
}

export function OrganizedArchive({
  docs,
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
}: Props) {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter((d) => {
      const hay = [
        d.file.name,
        d.file.ext,
        d.codice ?? "",
        DOC_TYPES[d.tipo].label,
        machineLabel(d.macchinaSerial),
        machineCategory(d.macchinaSerial),
        docYear(d),
        d.revisione ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [docs, query]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-surface/50">
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
              <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-7l-2-2H5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Archivio organizzato
          </div>
          <span className="shrink-0 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
            {filtered.length} documenti
          </span>
        </div>

        <div className="relative mb-3">
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

        <div className="flex flex-wrap gap-1.5">
          <span className="mr-1 self-center text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Visualizza per
          </span>
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => onViewModeChange(m.id)}
              className={[
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                viewMode === m.id
                  ? "border-brand/50 bg-brand-soft text-ink"
                  : "border-border bg-base text-ink-muted hover:border-border-strong",
              ].join(" ")}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-faint">
            Nessun documento corrisponde alla ricerca.
          </div>
        ) : viewMode === "macchina" ? (
          <ByMachineView docs={filtered} />
        ) : viewMode === "documento" ? (
          <ByDocumentView docs={filtered} />
        ) : viewMode === "file" ? (
          <ByFileView docs={filtered} />
        ) : (
          <ByYearView docs={filtered} />
        )}
      </div>
    </section>
  );
}

/** Tipo macchina → macchina → tipo documento → file */
function ByMachineView({ docs }: { docs: ArchivedDoc[] }) {
  const byCategory = useMemo(() => {
    const map = new Map<string, Map<string, ArchivedDoc[]>>();
    for (const d of docs) {
      const cat = machineCategory(d.macchinaSerial);
      if (!map.has(cat)) map.set(cat, new Map());
      const machines = map.get(cat)!;
      const arr = machines.get(d.macchinaSerial) ?? [];
      arr.push(d);
      machines.set(d.macchinaSerial, arr);
    }
    return Array.from(map.entries());
  }, [docs]);

  return (
    <>
      {byCategory.map(([category, machines]) => (
        <div key={category} className="overflow-hidden rounded-xl border border-border bg-base/50">
          <div className="border-b border-border bg-surface-2/50 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
              Tipo macchina
            </p>
            <p className="text-sm font-semibold text-ink">{category}</p>
          </div>
          <div className="space-y-3 p-3">
            {Array.from(machines.entries()).map(([serial, machineDocs]) => (
              <MachineBlock key={serial} serial={serial} docs={machineDocs} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Tipo documento → macchina → file */
function ByDocumentView({ docs }: { docs: ArchivedDoc[] }) {
  const byType = useMemo(() => {
    const map = new Map<DocType, ArchivedDoc[]>();
    for (const d of docs) {
      const arr = map.get(d.tipo) ?? [];
      arr.push(d);
      map.set(d.tipo, arr);
    }
    return TYPE_ORDER.filter((t) => map.has(t)).map((t) => [t, map.get(t)!] as const);
  }, [docs]);

  return (
    <>
      {byType.map(([tipo, typeDocs]) => (
        <div key={tipo} className="overflow-hidden rounded-xl border border-border bg-base/50">
          <div className="flex items-center gap-2 border-b border-border bg-surface-2/50 px-4 py-2.5">
            <DocTypeBadge tipo={tipo} />
            <span className="text-[11px] text-ink-faint">{typeDocs.length} file</span>
          </div>
          <div className="space-y-3 p-3">
            {groupByMachine(typeDocs).map(([serial, machineDocs]) => (
              <MachineBlock key={serial} serial={serial} docs={machineDocs} showTypeGroups={false} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Tipo file (estensione) → elenco file */
function ByFileView({ docs }: { docs: ArchivedDoc[] }) {
  const byExt = useMemo(() => {
    const map = new Map<string, ArchivedDoc[]>();
    for (const d of docs) {
      const ext = d.file.ext;
      const arr = map.get(ext) ?? [];
      arr.push(d);
      map.set(ext, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [docs]);

  return (
    <>
      {byExt.map(([ext, extDocs]) => (
        <div key={ext} className="overflow-hidden rounded-xl border border-border bg-base/50">
          <div className="flex items-center gap-2 border-b border-border bg-surface-2/50 px-4 py-2.5">
            <FileIcon ext={ext as FileExt} />
            <div>
              <p className="text-sm font-semibold text-ink">
                {FILE_EXT_LABELS[ext] ?? ext.toUpperCase()}
              </p>
              <p className="text-[11px] text-ink-faint">.{ext} · {extDocs.length} file</p>
            </div>
          </div>
          <div className="space-y-1 p-3">
            {extDocs.map((d) => (
              <DocRow key={d.file.id} doc={d} showMachine showDocType />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Anno → macchina → tipo documento → file */
function ByYearView({ docs }: { docs: ArchivedDoc[] }) {
  const byYear = useMemo(() => {
    const map = new Map<string, ArchivedDoc[]>();
    for (const d of docs) {
      const y = docYear(d);
      const arr = map.get(y) ?? [];
      arr.push(d);
      map.set(y, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [docs]);

  return (
    <>
      {byYear.map(([year, yearDocs]) => (
        <div key={year} className="overflow-hidden rounded-xl border border-border bg-base/50">
          <div className="border-b border-border bg-surface-2/50 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Anno</p>
            <p className="text-lg font-bold tabular-nums text-ink">{year}</p>
            <p className="text-[11px] text-ink-faint">{yearDocs.length} documenti</p>
          </div>
          <div className="space-y-3 p-3">
            {groupByMachine(yearDocs).map(([serial, machineDocs]) => (
              <MachineBlock key={serial} serial={serial} docs={machineDocs} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function groupByMachine(docs: ArchivedDoc[]): [string, ArchivedDoc[]][] {
  const map = new Map<string, ArchivedDoc[]>();
  for (const d of docs) {
    const arr = map.get(d.macchinaSerial) ?? [];
    arr.push(d);
    map.set(d.macchinaSerial, arr);
  }
  return Array.from(map.entries());
}

function MachineBlock({
  serial,
  docs,
  showTypeGroups = true,
}: {
  serial: string;
  docs: ArchivedDoc[];
  showTypeGroups?: boolean;
}) {
  const byType = TYPE_ORDER.map((tipo) => ({
    tipo,
    items: docs.filter((d) => d.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="rounded-lg border border-border/80 bg-surface/30">
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-brand">
            <path d="M4 20V10l6-3 6 3v10M4 20h16M9 20v-4h2v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{machineLabel(serial)}</p>
          <p className="text-[11px] text-ink-faint">{docs.length} documenti</p>
        </div>
      </div>

      {showTypeGroups ? (
        <div className="space-y-2 p-2">
          {byType.map((group) => (
            <div key={group.tipo}>
              <div className="mb-1 flex items-center gap-2 px-1">
                <DocTypeBadge tipo={group.tipo} />
              </div>
              <div className="space-y-1">
                {group.items.map((d) => (
                  <DocRow key={d.file.id} doc={d} showFileType />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {docs.map((d) => (
            <DocRow key={d.file.id} doc={d} showFileType showDocType />
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  showMachine,
  showDocType,
  showFileType,
}: {
  doc: ArchivedDoc;
  showMachine?: boolean;
  showDocType?: boolean;
  showFileType?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-2.5 py-1.5">
      <FileIcon ext={doc.file.ext} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">{doc.file.name}</p>
        <p className="truncate text-[11px] text-ink-faint">
          {[
            showMachine ? machineLabel(doc.macchinaSerial) : null,
            showDocType ? DOC_TYPES[doc.tipo].label : null,
            showFileType ? (FILE_EXT_LABELS[doc.file.ext] ?? doc.file.ext.toUpperCase()) : null,
            doc.codice ? `Cod. ${doc.codice}` : null,
            doc.revisione ? `Rev. ${doc.revisione}` : null,
            docYear(doc),
          ]
            .filter(Boolean)
            .join(" · ") || "Metadati estratti"}
        </p>
      </div>
      <ConfidenceBadge confidence={doc.confidence} />
    </div>
  );
}
