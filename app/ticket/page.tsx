"use client";

import { Suspense } from "react";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";

export default function TicketPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <TicketsWorkspace />
      </Suspense>
    </div>
  );
}
