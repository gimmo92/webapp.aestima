"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTicketFormIframeSnippet,
  buildTicketFormScriptSnippet,
} from "@/lib/embedSnippets";
import { TicketFormFieldsEditor } from "./TicketFormFieldsEditor";

export function TicketFormEmbedSettings() {
  const [slug, setSlug] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [copied, setCopied] = useState<"iframe" | "script" | null>(null);
  const [mode, setMode] = useState<"iframe" | "script">("iframe");
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.user?.company) return;
        setSlug(data.user.company.slug);
        setCompanyName(data.user.company.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const iframeSnippet = slug ? buildTicketFormIframeSnippet(baseUrl, slug) : "";
  const scriptSnippet = slug ? buildTicketFormScriptSnippet(baseUrl, slug) : "";
  const snippet = mode === "iframe" ? iframeSnippet : scriptSnippet;
  const previewUrl = slug ? `${baseUrl}/embed/ticket?company=${encodeURIComponent(slug)}` : "";

  const copy = async () => {
    if (!snippet) return;
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(mode);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard non disponibile */
    }
  };

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="text-xl font-bold text-ink">Form ticket embeddabile</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Pubblica sul sito un form che apre un ticket nel workspace
        {companyName ? ` di ${companyName}` : ""}. Il cliente può inserire
        contatto, macchina e allegare foto o documenti.
      </p>

      {!slug ? (
        <p className="mt-4 text-sm text-ink-faint">Carico i dati company…</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Apri form
            </a>
            <span className="text-xs text-ink-faint">
              Workspace <span className="font-mono text-brand">{slug}</span>
            </span>
          </div>

          <TicketFormFieldsEditor />
          <button
            type="button"
            onClick={() => setPreviewKey((n) => n + 1)}
            className="mt-4 text-xs font-medium text-brand hover:underline"
          >
            Aggiorna anteprima
          </button>

          <div className="mt-5 mb-3 flex rounded-lg border border-border bg-base p-1">
            <button
              type="button"
              onClick={() => setMode("iframe")}
              className={[
                "flex-1 rounded-md px-3 py-2 text-xs font-medium",
                mode === "iframe" ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
              ].join(" ")}
            >
              Iframe
            </button>
            <button
              type="button"
              onClick={() => setMode("script")}
              className={[
                "flex-1 rounded-md px-3 py-2 text-xs font-medium",
                mode === "script" ? "bg-surface text-ink shadow-sm" : "text-ink-muted",
              ].join(" ")}
            >
              Script
            </button>
          </div>

          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-lg border border-border bg-base px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-brand"
            >
              {copied === mode ? "Copiato!" : "Copia codice"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-border bg-base p-4 text-xs leading-relaxed text-ink-muted">
            {snippet}
          </pre>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface/40">
            <p className="border-b border-border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Anteprima
            </p>
            <iframe
              key={previewKey}
              src={previewUrl}
              title="Anteprima form ticket"
              className="h-[720px] w-full border-0 bg-base"
            />
          </div>
        </>
      )}
    </section>
  );
}
