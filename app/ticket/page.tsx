"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";

export default function TicketPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <TicketsWorkspace />
    </div>
  );
}
