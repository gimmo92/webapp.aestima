"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { KnowledgeWorkspace } from "@/components/knowledge/KnowledgeWorkspace";

export default function ManualePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <KnowledgeWorkspace />
    </div>
  );
}
