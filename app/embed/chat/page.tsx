"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ServiceChatWorkspace } from "@/components/service-chat/ServiceChatWorkspace";

function EmbedChatInner() {
  const params = useSearchParams();
  const minimalChrome = params.get("chrome") === "0";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <ServiceChatWorkspace
        embed
        hideReset={minimalChrome}
        hideHeader={minimalChrome}
      />
    </div>
  );
}

/** Contenuto chat per iframe embed (pannello bolla o chatbox larga). */
export default function EmbedChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-base text-sm text-ink-muted">
          Caricamento assistenza…
        </div>
      }
    >
      <EmbedChatInner />
    </Suspense>
  );
}
