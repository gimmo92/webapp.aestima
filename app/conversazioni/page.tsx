"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ConversationsWorkspace } from "@/components/conversations/ConversationsWorkspace";

export default function ConversazioniPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <ConversationsWorkspace />
    </div>
  );
}
