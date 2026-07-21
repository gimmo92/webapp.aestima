"use client";

import { useState } from "react";
import type { SourceFile } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";
import { ExcelPreviewModal } from "./ExcelPreviewModal";
import { ArchiveFileActions } from "./ArchiveFileActions";
import { SourceUploadZone } from "./SourceUploadZone";

// VISTA SORGENTE — cartella cloud disordinata (stile file browser).
// In produzione: cartella reale via API (Drive/SharePoint/Dropbox).

interface Props {
  files: SourceFile[];
  onOrganize?: () => void;
  organizing?: boolean;
  /** Modalità compatta usata nel confronto "prima → dopo". */
  compact?: boolean;
  onDeleteFile?: (fileId: string) => void;
  onShowApiFile?: (file: SourceFile) => void;
  onUploadFiles?: (files: File[]) => void;
}

export function SourceBrowser({
  files,
  onOrganize,
  organizing,
  compact,
  onDeleteFile,
  onShowApiFile,
  onUploadFiles,
}: Props) {
  const [excelPreview, setExcelPreview] = useState<{
    name: string;
    url: string;
  } | null>(null);

  return (
    <>
      {excelPreview && (
        <ExcelPreviewModal
          fileName={excelPreview.name}
          url={excelPreview.url}
          onClose={() => setExcelPreview(null)}
        />
      )}
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-surface/50">
      {/* Header cartella */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-ink-faint">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            </svg>
            Drive cloud · Ricambi · Da archiviare
          </div>
          <p className="mt-0.5 text-xs text-ink-faint">
            {files.length} file
          </p>
        </div>
        {onOrganize && (
          <button
            onClick={onOrganize}
            disabled={organizing}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 3v2m0 14v2m9-9h-2M5 12H3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
            </svg>
            Organizza con aestima
          </button>
        )}
        {compact && !onOrganize && (
          <span className="shrink-0 rounded-full border border-border bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-ink-faint">
            Prima
          </span>
        )}
      </div>

      {onUploadFiles && <SourceUploadZone onUpload={onUploadFiles} />}

      {/* Lista file */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {files.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-ink-faint">
            Nessun file in sorgente. Carica documenti per iniziare.
          </p>
        ) : (
          files.map((f) => {
          const canPreview = f.ext === "xlsx" && !!f.publicUrl;
          return (
          <div
            key={f.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/50"
          >
            <FileIcon ext={f.ext} />
            <div className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!canPreview}
                onClick={() =>
                  canPreview &&
                  setExcelPreview({ name: f.name, url: f.publicUrl! })
                }
                className={[
                  "truncate text-left text-sm",
                  canPreview
                    ? "text-ink hover:text-brand"
                    : "cursor-default text-ink",
                ].join(" ")}
              >
                {f.name}
              </button>
              <p className="truncate text-[11px] text-ink-faint">
                {f.sizeLabel} · {f.modified}
                {f.uploaded ? " · caricato ora" : ""}
              </p>
            </div>
            {canPreview && (
              <button
                type="button"
                onClick={() =>
                  setExcelPreview({ name: f.name, url: f.publicUrl! })
                }
                className="shrink-0 rounded-md border border-border bg-base px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-brand/50 hover:text-brand"
              >
                Apri
              </button>
            )}
            {onDeleteFile && onShowApiFile && (
              <ArchiveFileActions
                onApi={() => onShowApiFile(f)}
                onDelete={() => onDeleteFile(f.id)}
              />
            )}
            {!compact && !f.uploaded && (
              <span className="shrink-0 rounded-full border border-dashed border-border-strong px-2 py-0.5 text-[10px] font-medium text-ink-faint">
                da classificare
              </span>
            )}
            {!compact && f.uploaded && (
              <span className="shrink-0 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-[10px] font-medium text-brand">
                nuovo
              </span>
            )}
          </div>
          );
          })
        )}
      </div>
    </section>
    </>
  );
}
