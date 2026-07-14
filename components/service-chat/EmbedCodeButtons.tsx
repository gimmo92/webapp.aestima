"use client";

import { useState } from "react";
import { EmbedCodeModal } from "./EmbedCodeModal";

export function EmbedCodeButtons() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
        title="Codice embed per sito cliente"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M16 18v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M8 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm12 8v-1a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Embed
      </button>
      {open && <EmbedCodeModal onClose={() => setOpen(false)} />}
    </>
  );
}
