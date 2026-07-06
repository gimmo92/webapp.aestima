"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { PipelineBoard } from "@/components/inbox/PipelineBoard";

// Vista pipeline delle offerte (board Kanban). Condivide lo stato
// con l'inbox tramite InboxProvider (vedi app/layout.tsx).

export default function PipelinePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <PipelineBoard />
    </div>
  );
}
