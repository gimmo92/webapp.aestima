import type { FileExt } from "@/lib/archiveTypes";

// Icona file colorata in base all'estensione (stile file browser).

const EXT_STYLE: Record<FileExt, { color: string; label: string }> = {
  pdf: { color: "#f85149", label: "PDF" },
  xlsx: { color: "#2ea043", label: "XLS" },
  jpg: { color: "#a855f7", label: "JPG" },
  png: { color: "#a855f7", label: "PNG" },
  dwg: { color: "#2f81f7", label: "DWG" },
  docx: { color: "#1f6feb", label: "DOC" },
};

export function FileIcon({ ext }: { ext: FileExt }) {
  const s = EXT_STYLE[ext] ?? { color: "#6b7d92", label: "FILE" };
  return (
    <span className="relative inline-flex h-9 w-8 shrink-0 items-center justify-center">
      <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden="true">
        <path
          d="M4 2h14l8 8v22a0 0 0 0 1 0 0H4a0 0 0 0 1 0 0V2Z"
          fill="var(--color-surface-2)"
          stroke="var(--color-border-strong)"
          strokeWidth="1.2"
        />
        <path d="M18 2v8h8" fill="none" stroke="var(--color-border-strong)" strokeWidth="1.2" />
      </svg>
      <span
        className="absolute bottom-1 left-1/2 -translate-x-1/2 rounded-[3px] px-1 text-[8px] font-bold leading-tight text-white"
        style={{ backgroundColor: s.color }}
      >
        {s.label}
      </span>
    </span>
  );
}
