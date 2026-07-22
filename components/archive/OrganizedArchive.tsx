"use client";

import { useMemo, useState } from "react";
import {
  DOC_TYPES,
  FILE_EXT_LABELS,
  docYear,
  machineCategory,
  machineLabel,
} from "@/lib/archiveData";
import type { ArchivedDoc, DocType, FileExt, SourceFile } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";
import { DocTypeBadge } from "./DocTypeBadge";
import { ConfidenceBadge } from "./ConfidenceBadge";
import {
  ArchiveFileViewer,
  ArchiveOpenButton,
  canPreviewArchiveFile,
} from "./ArchiveFileViewer";
import { ArchiveFileActions } from "./ArchiveFileActions";

// VISTA ARCHIVIO ORGANIZZATO — raggruppamento configurabile:
// per tipo macchina (default), tipo documento, tipo file o anno.

export type ArchiveViewMode =
  | "macchina"
  | "cliente"
  | "documento"
  | "file"
  | "anno";

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
  { id: "cliente", label: "Cliente" },
  { id: "documento", label: "Tipo documento" },
  { id: "file", label: "Tipo file" },
  { id: "anno", label: "Anno" },
];

const NO_MACHINE = "__nessuna_macchina__";
const NO_CLIENTE = "Senza cliente";

interface Props {
  docs: ArchivedDoc[];
  query: string;
  onQueryChange: (q: string) => void;
  viewMode: ArchiveViewMode;
  onViewModeChange: (mode: ArchiveViewMode) => void;
  onDeleteFile: (fileId: string) => void;
  onShowApiFile: (file: SourceFile) => void;
}

type FileActions = Pick<Props, "onDeleteFile" | "onShowApiFile">;

export function OrganizedArchive({
  docs,
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
  onDeleteFile,
  onShowApiFile,
}: Props) {
  const [preview, setPreview] = useState<{
    name: string;
    url: string;
    ext: FileExt;
  } | null>(null);

  const openFile = (doc: ArchivedDoc) => {
    if (!canPreviewArchiveFile(doc.file) || !doc.file.publicUrl) return;
    setPreview({
      name: doc.file.name,
      url: doc.file.publicUrl,
      ext: doc.file.ext,
    });
  };

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
        d.cliente ?? "",
        docYear(d),
        d.revisione ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [docs, query]);

  return (
    <>
      {preview && (
        <ArchiveFileViewer file={preview} onClose={() => setPreview(null)} />
      )}
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
            placeholder="Cerca un ricambio, una macchina, un cliente…"
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
          <ByMachineView
            docs={filtered}
            onOpenFile={openFile}
            onDeleteFile={onDeleteFile}
            onShowApiFile={onShowApiFile}
          />
        ) : viewMode === "cliente" ? (
          <ByClienteView
            docs={filtered}
            onOpenFile={openFile}
            onDeleteFile={onDeleteFile}
            onShowApiFile={onShowApiFile}
          />
        ) : viewMode === "documento" ? (
          <ByDocumentView
            docs={filtered}
            onOpenFile={openFile}
            onDeleteFile={onDeleteFile}
            onShowApiFile={onShowApiFile}
          />
        ) : viewMode === "file" ? (
          <ByFileView
            docs={filtered}
            onOpenFile={openFile}
            onDeleteFile={onDeleteFile}
            onShowApiFile={onShowApiFile}
          />
        ) : (
          <ByYearView
            docs={filtered}
            onOpenFile={openFile}
            onDeleteFile={onDeleteFile}
            onShowApiFile={onShowApiFile}
          />
        )}
      </div>
    </section>
    </>
  );
}

/** Tipo macchina → macchina → tipo documento → file */
function ByMachineView({
  docs,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  docs: ArchivedDoc[];
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
  const byCategory = useMemo(() => {
    const map = new Map<string, Map<string, ArchivedDoc[]>>();
    for (const d of docs) {
      const serialKey = d.macchinaSerial ?? NO_MACHINE;
      const cat = machineCategory(d.macchinaSerial);
      if (!map.has(cat)) map.set(cat, new Map());
      const machines = map.get(cat)!;
      const arr = machines.get(serialKey) ?? [];
      arr.push(d);
      machines.set(serialKey, arr);
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
            {Array.from(machines.entries()).map(([serialKey, machineDocs]) => (
              <MachineBlock
                key={serialKey}
                serial={serialKey === NO_MACHINE ? null : serialKey}
                docs={machineDocs}
                onOpenFile={onOpenFile}
                onDeleteFile={onDeleteFile}
                onShowApiFile={onShowApiFile}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Cliente → macchina → file */
function ByClienteView({
  docs,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  docs: ArchivedDoc[];
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
  const byCliente = useMemo(() => {
    const map = new Map<string, ArchivedDoc[]>();
    for (const d of docs) {
      const key = d.cliente?.trim() || NO_CLIENTE;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === NO_CLIENTE) return 1;
      if (b === NO_CLIENTE) return -1;
      return a.localeCompare(b, "it");
    });
  }, [docs]);

  return (
    <>
      {byCliente.map(([cliente, clienteDocs]) => (
        <div key={cliente} className="overflow-hidden rounded-xl border border-border bg-base/50">
          <div className="flex items-center gap-2 border-b border-border bg-surface-2/50 px-4 py-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-soft text-brand">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{cliente}</p>
              <p className="text-[11px] text-ink-faint">
                {clienteDocs.length} documenti
              </p>
            </div>
          </div>
          <div className="space-y-3 p-3">
            {groupByMachine(clienteDocs).map(([serialKey, machineDocs]) => (
              <MachineBlock
                key={serialKey}
                serial={serialKey === NO_MACHINE ? null : serialKey}
                docs={machineDocs}
                onOpenFile={onOpenFile}
                onDeleteFile={onDeleteFile}
                onShowApiFile={onShowApiFile}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Tipo documento → macchina → file */
function ByDocumentView({
  docs,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  docs: ArchivedDoc[];
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
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
            {groupByMachine(typeDocs).map(([serialKey, machineDocs]) => (
              <MachineBlock
                key={serialKey}
                serial={serialKey === NO_MACHINE ? null : serialKey}
                docs={machineDocs}
                showTypeGroups={false}
                onOpenFile={onOpenFile}
                onDeleteFile={onDeleteFile}
                onShowApiFile={onShowApiFile}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Tipo file (estensione) → elenco file */
function ByFileView({
  docs,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  docs: ArchivedDoc[];
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
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
              <DocRow
                key={d.file.id}
                doc={d}
                showMachine
                showCliente
                showDocType
                onOpenFile={onOpenFile}
                onDeleteFile={onDeleteFile}
                onShowApiFile={onShowApiFile}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** Anno → macchina → tipo documento → file */
function ByYearView({
  docs,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  docs: ArchivedDoc[];
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
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
            {groupByMachine(yearDocs).map(([serialKey, machineDocs]) => (
              <MachineBlock
                key={serialKey}
                serial={serialKey === NO_MACHINE ? null : serialKey}
                docs={machineDocs}
                onOpenFile={onOpenFile}
                onDeleteFile={onDeleteFile}
                onShowApiFile={onShowApiFile}
              />
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
    const key = d.macchinaSerial ?? NO_MACHINE;
    const arr = map.get(key) ?? [];
    arr.push(d);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

function MachineBlock({
  serial,
  docs,
  showTypeGroups = true,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  serial: string | null;
  docs: ArchivedDoc[];
  showTypeGroups?: boolean;
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
  const byType = TYPE_ORDER.map((tipo) => ({
    tipo,
    items: docs.filter((d) => d.tipo === tipo),
  })).filter((g) => g.items.length > 0);

  const clienteHint = docs.find((d) => d.cliente)?.cliente;

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
          <p className="truncate text-[11px] text-ink-faint">
            {[clienteHint, `${docs.length} documenti`].filter(Boolean).join(" · ")}
          </p>
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
                  <DocRow
                    key={d.file.id}
                    doc={d}
                    showFileType
                    showCliente={!clienteHint}
                    onOpenFile={onOpenFile}
                    onDeleteFile={onDeleteFile}
                    onShowApiFile={onShowApiFile}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {docs.map((d) => (
            <DocRow
              key={d.file.id}
              doc={d}
              showFileType
              showDocType
              showCliente
              onOpenFile={onOpenFile}
              onDeleteFile={onDeleteFile}
              onShowApiFile={onShowApiFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DocRow({
  doc,
  showMachine,
  showCliente,
  showDocType,
  showFileType,
  onOpenFile,
  onDeleteFile,
  onShowApiFile,
}: {
  doc: ArchivedDoc;
  showMachine?: boolean;
  showCliente?: boolean;
  showDocType?: boolean;
  showFileType?: boolean;
  onOpenFile: (doc: ArchivedDoc) => void;
} & FileActions) {
  const canPreview = canPreviewArchiveFile(doc.file);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 px-2.5 py-1.5">
      <FileIcon ext={doc.file.ext} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          disabled={!canPreview}
          onClick={() => canPreview && onOpenFile(doc)}
          className={[
            "truncate text-left text-sm",
            canPreview
              ? "text-ink hover:text-brand"
              : "cursor-default text-ink",
          ].join(" ")}
        >
          {doc.file.name}
        </button>
        <p className="truncate text-[11px] text-ink-faint">
          {[
            showMachine ? machineLabel(doc.macchinaSerial) : null,
            showCliente ? doc.cliente : null,
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
      {canPreview && <ArchiveOpenButton onClick={() => onOpenFile(doc)} />}
      <ArchiveFileActions
        onApi={() => onShowApiFile(doc.file)}
        onDelete={() => onDeleteFile(doc.file.id)}
      />
      <ConfidenceBadge confidence={doc.confidence} />
    </div>
  );
}
