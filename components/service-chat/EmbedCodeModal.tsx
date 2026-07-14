"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  buildEmbedSnippet,
  EMBED_MODE_LABELS,
  type EmbedMode,
} from "@/lib/embedSnippets";

interface Props {
  mode: EmbedMode;
  onClose: () => void;
}

export function EmbedCodeModal({ mode, onClose }: Props) {
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
          <div>
            <h2 id="embed-code-modal-title" className="text-lg font-bold text-ink">
              Codice embed — {EMBED_MODE_LABELS[mode]}
            </h2>
            <p className="mt-0.5 text-xs text-ink-faint">
              Incolla nel sito cliente · sostituisci il dominio in produzione
            </p>
          </div>
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
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-ink-muted">Snippet HTML</p>
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

          <div className="mt-4 rounded-xl border border-border bg-base/60 p-4 text-xs text-ink-muted">
            <p className="mb-2 font-semibold text-ink">Attributi principali</p>
            <ul className="space-y-1">
              <li>
                <code className="text-brand">data-mode</code> —{" "}
                <code>bubble</code> | <code>wide</code>
              </li>
              <li>
                <code className="text-brand">data-base-url</code> — URL deploy
                aestima ({baseUrl})
              </li>
              {mode === "wide" && (
                <>
                  <li>
                    <code className="text-brand">data-container</code> — id del
                    div contenitore
                  </li>
                  <li>
                    <code className="text-brand">data-height</code> — altezza in
                    px (default 640)
                  </li>
                </>
              )}
              {mode === "bubble" && (
                <li>
                  <code className="text-brand">data-position</code> —{" "}
                  bottom-right | bottom-left
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
