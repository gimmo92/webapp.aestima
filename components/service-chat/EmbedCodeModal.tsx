"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildEmbedSnippet,
  EMBED_MODE_LABELS,
  type EmbedMode,
} from "@/lib/embedSnippets";

interface Props {
  onClose: () => void;
}

const MODES: EmbedMode[] = ["bubble", "wide"];

export function EmbedCodeModal({ onClose }: Props) {
  const [mode, setMode] = useState<EmbedMode>("bubble");
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://your-domain.vercel.app";
    return window.location.origin;
  }, []);
  const snippet = buildEmbedSnippet(baseUrl, mode);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard non disponibile */
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="embed-code-modal-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 id="embed-code-modal-title" className="text-lg font-bold text-ink">
            Codice embed
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Chiudi"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="mb-4 flex rounded-lg border border-border bg-base p-1">
            {MODES.map((m) => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setCopied(false);
                  }}
                  className={[
                    "flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                    active
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  {EMBED_MODE_LABELS[m]}
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex items-center justify-end">
            <button
              onClick={() => void copySnippet()}
              className="rounded-lg border border-border bg-base px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
            >
              {copied ? "Copiato!" : "Copia codice"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-border bg-base p-4 text-xs leading-relaxed text-ink-muted">
            {snippet}
          </pre>
        </div>
      </div>
    </div>,
    document.body
  );
}
