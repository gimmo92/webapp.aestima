"use client";

import { useRef, useState } from "react";

export const CATALOG_UPLOAD_ACCEPT =
  ".pdf,.xlsx,.xls,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv";

const ALLOWED_EXT = new Set(["pdf", "xlsx", "xls", "csv", "txt"]);

export type UploadedCatalogFile = {
  id: string;
  name: string;
  sizeLabel: string;
  ext: string;
  /** true = file demo / virtuale, non un File reale del browser */
  demo?: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extOf(name: string): string | null {
  const m = name.match(/\.([a-z0-9]+)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  return ALLOWED_EXT.has(ext) ? ext : null;
}

export function filesFromFileList(list: FileList | File[]): UploadedCatalogFile[] {
  const arr = Array.from(list);
  const out: UploadedCatalogFile[] = [];
  for (const file of arr) {
    const ext = extOf(file.name);
    if (!ext) continue;
    out.push({
      id: `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      sizeLabel: formatSize(file.size),
      ext,
    });
  }
  return out;
}

interface Props {
  disabled?: boolean;
  onUpload: (files: UploadedCatalogFile[]) => void;
}

export function CatalogUploadZone({ disabled, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list?.length || disabled) return;
    const files = filesFromFileList(list);
    if (files.length) onUpload(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={CATALOG_UPLOAD_ACCEPT}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => pick(e.target.files)}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files);
        }}
        className={[
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          dragOver
            ? "border-brand bg-brand-soft/40"
            : "border-border-strong bg-surface/50 hover:border-brand/40 hover:bg-brand-soft/20",
        ].join(" ")}
      >
        <span className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V8m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-sm font-semibold text-ink sm:text-base">
          Trascina qui il catalogo oppure{" "}
          <span className="text-brand">scegli i file</span>
        </p>
        <p className="mt-1 text-xs text-ink-faint sm:text-sm">
          PDF, Excel (.xlsx / .xls), CSV — listino, catalogo ricambi o export gestionale
        </p>
      </button>
    </div>
  );
}
