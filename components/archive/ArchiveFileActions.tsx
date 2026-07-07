"use client";

interface Props {
  onApi: () => void;
  onDelete: () => void;
  compact?: boolean;
}

/** Pulsanti condivisi API + Elimina su ogni file dell'archivio. */
export function ArchiveFileActions({ onApi, onDelete, compact }: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onApi();
        }}
        className="rounded-md border border-border bg-base px-2 py-1 text-[11px] font-semibold text-brand transition-colors hover:border-brand/50 hover:bg-brand-soft"
      >
        API
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm("Eliminare questo file dall'archivio?")) onDelete();
        }}
        className={[
          "rounded-md border border-border bg-base text-[11px] font-medium text-ink-muted transition-colors hover:border-warn/50 hover:bg-warn/10 hover:text-warn",
          compact ? "px-1.5 py-1" : "px-2 py-1",
        ].join(" ")}
      >
        Elimina
      </button>
    </div>
  );
}
