"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ArchiveWorkspace } from "@/components/archive/ArchiveWorkspace";

// Tab "Archivio" — agente di organizzazione documentale after-sales.
// Condivide la navigazione con inbox e pipeline (InboxTopBar).

export default function ArchivioPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <ArchiveWorkspace />
    </div>
  );
}
