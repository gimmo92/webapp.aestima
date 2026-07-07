"use client";

import { useRef, useState } from "react";
import { UPLOAD_ACCEPT } from "@/lib/uploadSourceFile";

interface Props {
  onUpload: (files: File[]) => void;
}

export function SourceUploadZone({ onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pick = (list: FileList | null) => {
    if (!list?.length) return;
    onUpload(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="border-b border-border px-4 py-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="sr-only"
        onChange={(e) => pick(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
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
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors",
          dragOver
            ? "border-brand bg-brand-soft/40"
            : "border-border-strong bg-base/40 hover:border-brand/40 hover:bg-brand-soft/20",
        ].join(" ")}
      >
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 16V8m0 0 4 4m-4-4-4 4M4 16.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <p className="text-sm font-medium text-ink">
          Trascina i file qui oppure{" "}
          <span className="text-brand">clicca per caricarli</span>
        </p>
        <p className="mt-1 text-[11px] text-ink-faint">
          PDF, Excel, immagini, DWG, Word — verranno aggiunti alla sorgente da classificare
        </p>
      </button>
    </div>
  );
}
