"use client";

import type { FileExt, SourceFile } from "@/lib/archiveTypes";
import { ExcelPreviewModal } from "./ExcelPreviewModal";
import { useEffect } from "react";

const PREVIEWABLE: FileExt[] = ["xlsx", "pdf", "jpg", "png"];

export function canPreviewArchiveFile(
  file: Pick<SourceFile, "ext" | "publicUrl">
): boolean {
  return !!file.publicUrl && PREVIEWABLE.includes(file.ext);
}

type PreviewTarget = {
  name: string;
  url: string;
  ext: FileExt;
};

/** Modal unificata: Excel tabellare, PDF in iframe, immagini a tutto schermo. */
export function ArchiveFileViewer({
  file,
  onClose,
}: {
  file: PreviewTarget;
  onClose: () => void;
}) {
  if (file.ext === "xlsx") {
    return (
      <ExcelPreviewModal
        fileName={file.name}
        url={file.url}
        onClose={onClose}
      />
    );
  }

  return <MediaPreviewModal file={file} onClose={onClose} />;
}

function MediaPreviewModal({
  file,
  onClose,
}: {
  file: PreviewTarget;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const isImage = file.ext === "jpg" || file.ext === "png";
  const badge = file.ext.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-base/95 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-[10px] font-bold text-brand">
            {badge}
          </span>
          <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={file.url}
            download={file.name}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            Scarica
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi anteprima"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-6">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob URL anteprima upload
          <img
            src={file.url}
            alt={file.name}
            className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
          />
        ) : (
          <iframe
            title={file.name}
            src={file.url}
            className="h-full w-full max-w-5xl rounded-xl border border-border bg-white shadow-2xl"
          />
        )}
      </div>
    </div>
  );
}

/** Pulsante "Apri" condiviso per le liste archivio. */
export function ArchiveOpenButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="shrink-0 rounded-md border border-border bg-base px-2 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-brand/50 hover:text-brand"
    >
      Apri
    </button>
  );
}
