"use client";

import { useEffect, useState } from "react";
import type { SourceFile } from "@/lib/archiveTypes";
import { archiveFileApiUrl, archiveFileCurl } from "@/lib/archiveApi";

interface Props {
  file: SourceFile;
  onClose: () => void;
}

export function ArchiveApiModal({ file, onClose }: Props) {
  const [payload, setPayload] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"url" | "curl" | null>(null);

  const url = archiveFileApiUrl(file.id);
  const curl = archiveFileCurl(file.id);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (!cancelled) setPayload(JSON.stringify(data, null, 2));
      })
      .catch(() => {
        if (!cancelled) setError("Impossibile contattare l'endpoint API.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const copy = async (text: string, kind: "url" | "curl") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-base shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">API documento</p>
            <p className="truncate text-xs text-ink-faint">{file.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-ink-muted hover:text-ink"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-4">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Endpoint
            </p>
            <div className="flex gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-surface px-3 py-2 text-xs text-brand">
                GET {url.replace(/^https?:\/\/[^/]+/, "")}
              </code>
              <button
                onClick={() => copy(url, "url")}
                className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-ink-muted hover:text-ink"
              >
                {copied === "url" ? "Copiato" : "Copia"}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              cURL
            </p>
            <div className="flex gap-2">
              <code className="min-w-0 flex-1 break-all rounded-lg border border-border bg-surface px-3 py-2 text-[11px] text-ink-muted">
                {curl}
              </code>
              <button
                onClick={() => copy(curl, "curl")}
                className="shrink-0 rounded-lg border border-border px-2.5 py-2 text-xs font-medium text-ink-muted hover:text-ink"
              >
                {copied === "curl" ? "Copiato" : "Copia"}
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Risposta live
            </p>
            {loading ? (
              <p className="text-sm text-ink-faint">Carico…</p>
            ) : error ? (
              <p className="text-sm text-warn">{error}</p>
            ) : (
              <pre className="max-h-48 overflow-auto rounded-lg border border-border bg-surface p-3 text-[11px] leading-relaxed text-ink-muted">
                {payload}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
