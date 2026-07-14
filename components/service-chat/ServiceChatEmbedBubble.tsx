"use client";

import { useCallback, useEffect, useState } from "react";
import { ServiceChatWorkspace } from "./ServiceChatWorkspace";

interface Props {
  /** Anteprima same-origin senza iframe (pagina /embed). */
  inline?: boolean;
  baseUrl?: string;
  position?: "bottom-right" | "bottom-left";
  panelWidth?: number;
  panelHeight?: number;
}

const DEFAULT_BASE = "";

/**
 * Widget bolla: pulsante floating + pannello chat.
 * Su siti esterni usa iframe via public/embed.js; in demo può montare la chat inline.
 */
export function ServiceChatEmbedBubble({
  inline = false,
  baseUrl = DEFAULT_BASE,
  position = "bottom-right",
  panelWidth = 400,
  panelHeight = 580,
}: Props) {
  const [open, setOpen] = useState(false);
  const [resolvedBase, setResolvedBase] = useState(baseUrl);

  useEffect(() => {
    if (!baseUrl && typeof window !== "undefined") {
      setResolvedBase(window.location.origin);
    }
  }, [baseUrl]);

  const iframeSrc = `${resolvedBase}/embed/chat?chrome=0`;
  const isLeft = position === "bottom-left";

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <>
      {/* Pannello chat */}
      {open && (
        <div
          className={[
            "fixed z-[9999] flex flex-col overflow-hidden rounded-2xl border border-border bg-base shadow-2xl shadow-black/40",
            isLeft ? "left-5" : "right-5",
          ].join(" ")}
          style={{
            bottom: 88,
            width: panelWidth,
            height: panelHeight,
            maxWidth: "calc(100vw - 2.5rem)",
            maxHeight: "calc(100vh - 6rem)",
          }}
          role="dialog"
          aria-label="Assistenza service aestima"
        >
          <div className="flex items-center justify-between border-b border-border bg-surface px-3 py-2">
            <span className="text-xs font-semibold text-ink">
              Assistenza aestima
            </span>
            <button
              type="button"
              onClick={close}
              className="rounded-md p-1 text-ink-faint hover:bg-surface-2 hover:text-ink"
              aria-label="Chiudi chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {inline ? (
              <ServiceChatWorkspace embed hideReset />
            ) : (
              <iframe
                src={iframeSrc}
                title="Chat assistenza aestima"
                className="h-full w-full border-0"
                allow="clipboard-write"
              />
            )}
          </div>
        </div>
      )}

      {/* Launcher bolla */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "fixed bottom-5 z-[9998] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-xl shadow-brand/30 transition-transform hover:scale-105 hover:bg-brand-strong",
          isLeft ? "left-5" : "right-5",
          open ? "rotate-0" : "",
        ].join(" ")}
        aria-label={open ? "Chiudi assistenza" : "Apri assistenza service"}
        aria-expanded={open}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6 6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
