"use client";

import { useState } from "react";
import { EmbedCodeModal } from "./EmbedCodeModal";
import type { EmbedMode } from "@/lib/embedSnippets";

export function EmbedCodeButtons() {
  const [openMode, setOpenMode] = useState<EmbedMode | null>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpenMode("bubble")}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
        title="Codice embed bolla floating"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="M8 12h8M12 8v8"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Embed bolla
      </button>
      <button
        type="button"
        onClick={() => setOpenMode("wide")}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
        title="Codice embed chatbox larga"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect
            x="3"
            y="5"
            width="18"
            height="14"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M7 9h10M7 13h6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Embed chatbox
      </button>
      {openMode && (
        <EmbedCodeModal mode={openMode} onClose={() => setOpenMode(null)} />
      )}
    </>
  );
}
