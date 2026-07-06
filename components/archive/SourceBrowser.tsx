"use client";

import type { SourceFile } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";

// VISTA SORGENTE — cartella cloud disordinata (stile file browser).
// In produzione: cartella reale via API (Drive/SharePoint/Dropbox).

interface Props {
  files: SourceFile[];
  onOrganize?: () => void;
  organizing?: boolean;
  /** Modalità compatta usata nel confronto "prima → dopo". */
  compact?: boolean;
}

export function SourceBrowser({ files, onOrganize, organizing, compact }: Props) {
  return (
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
            {files.length} file · nomi e struttura disordinati
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
        {compact && (
          <span className="shrink-0 rounded-full border border-border bg-surface-2/70 px-2.5 py-1 text-[11px] font-medium text-ink-faint">
            Prima
          </span>
        )}
      </div>

      {/* Lista file */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {files.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/50"
          >
            <FileIcon ext={f.ext} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{f.name}</p>
              <p className="truncate text-[11px] text-ink-faint">
                {f.sizeLabel} · {f.modified}
              </p>
            </div>
            {!compact && (
              <span className="shrink-0 rounded-full border border-dashed border-border-strong px-2 py-0.5 text-[10px] font-medium text-ink-faint">
                da classificare
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
