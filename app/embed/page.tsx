"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ServiceChatEmbedBubble } from "@/components/service-chat/ServiceChatEmbedBubble";
import { ServiceChatEmbedWide } from "@/components/service-chat/ServiceChatEmbedWide";

type EmbedMode = "bubble" | "wide";

function useEmbedBaseUrl() {
  return useMemo(() => {
    if (typeof window === "undefined") return "https://your-domain.vercel.app";
    return window.location.origin;
  }, []);
}

export default function EmbedDocsPage() {
  const baseUrl = useEmbedBaseUrl();
  const [mode, setMode] = useState<EmbedMode>("wide");
  const [copied, setCopied] = useState(false);

  const snippet =
    mode === "bubble"
      ? `<script
  src="${baseUrl}/embed.js"
  data-mode="bubble"
  data-base-url="${baseUrl}"
  async
></script>`
      : `<div id="aestima-chat-wide"></div>
<script
  src="${baseUrl}/embed.js"
  data-mode="wide"
  data-base-url="${baseUrl}"
  data-container="aestima-chat-wide"
  data-height="640"
  async
></script>`;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard non disponibile */
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <InboxTopBar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8">
        <div className="mb-8">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">
            Integrazione
          </p>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">
            Embed assistenza service
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            Incorpora la chat AI su siti cliente con due modalità:{" "}
            <strong className="font-medium text-ink">bolla floating</strong>{" "}
            (pulsante angolo schermo) o{" "}
            <strong className="font-medium text-ink">chatbox larga</strong>{" "}
            inline nella pagina. In produzione sostituisci{" "}
            <code className="rounded bg-surface-2 px-1 font-mono text-xs">
              data-base-url
            </code>{" "}
            con il dominio aestima del cliente.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              { id: "wide" as const, label: "Chatbox larga" },
              { id: "bubble" as const, label: "Bolla floating" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={[
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                mode === tab.id
                  ? "bg-brand text-white shadow-lg shadow-brand/20"
                  : "border border-border bg-surface text-ink-muted hover:text-ink",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
          <Link
            href="/assistenza"
            className="ml-auto inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            Apri chat completa →
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Anteprima live */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-ink">Anteprima</h2>
            {mode === "wide" ? (
              <div className="overflow-hidden rounded-2xl border border-border shadow-xl shadow-black/30">
                <ServiceChatEmbedWide inline height={560} />
              </div>
            ) : (
              <div className="relative h-[560px] overflow-hidden rounded-2xl border border-border bg-grid shadow-xl shadow-black/30">
                <p className="absolute left-4 top-4 max-w-xs text-sm text-ink-muted">
                  Simula una pagina cliente: la bolla compare in basso a
                  destra. Clicca per aprire il pannello chat.
                </p>
                <ServiceChatEmbedBubble inline baseUrl={baseUrl} />
              </div>
            )}
          </div>

          {/* Snippet */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-ink">Codice embed</h2>
              <button
                onClick={() => void copySnippet()}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink"
              >
                {copied ? "Copiato!" : "Copia snippet"}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-2xl border border-border bg-surface p-4 text-xs leading-relaxed text-ink-muted">
              {snippet}
            </pre>

            <div className="rounded-xl border border-border bg-base/60 p-4 text-sm text-ink-muted">
              <p className="mb-2 font-semibold text-ink">Attributi script</p>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <code className="text-brand">data-mode</code> —{" "}
                  <code>bubble</code> | <code>wide</code>
                </li>
                <li>
                  <code className="text-brand">data-base-url</code> — URL
                  deploy aestima
                </li>
                <li>
                  <code className="text-brand">data-container</code> — id div
                  (solo wide)
                </li>
                <li>
                  <code className="text-brand">data-height</code> — altezza px
                  chatbox (default 640)
                </li>
                <li>
                  <code className="text-brand">data-position</code> —{" "}
                  bottom-right | bottom-left (solo bubble)
                </li>
              </ul>
            </div>

            <p className="text-xs text-ink-faint">
              Iframe diretto:{" "}
              <code className="font-mono">{baseUrl}/embed/chat</code>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
