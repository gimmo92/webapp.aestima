"use client";

import { Suspense } from "react";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ArchiveWorkspace } from "@/components/archive/ArchiveWorkspace";

// Tab "Archivio" — agente di organizzazione documentale after-sales.
// Condivide la navigazione con inbox e pipeline (InboxTopBar).

export default function ArchivioPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      {/* Suspense richiesto da useSearchParams (link interni ?q=). */}
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <ArchiveWorkspace />
      </Suspense>
    </div>
  );
}
