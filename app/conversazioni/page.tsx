"use client";

import { Suspense } from "react";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ConversationsWorkspace } from "@/components/conversations/ConversationsWorkspace";

export default function ConversazioniPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <ConversationsWorkspace />
      </Suspense>
    </div>
  );
}
