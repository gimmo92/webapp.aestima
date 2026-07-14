"use client";

import { Suspense } from "react";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";

export default function ManualePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center text-sm text-ink-muted">
            Caricamento manuale…
          </div>
        }
      >
        <KnowledgeWorkspace />
      </Suspense>
    </div>
  );
}
