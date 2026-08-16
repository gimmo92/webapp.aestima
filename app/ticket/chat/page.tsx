"use client";

import { Suspense } from "react";
import { TicketingShell } from "@/components/tickets/TicketingShell";
import { ConversationsWorkspace } from "@/components/conversations/ConversationsWorkspace";

export default function TicketingChatPage() {
  return (
    <TicketingShell>
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <ConversationsWorkspace />
      </Suspense>
    </TicketingShell>
  );
}
