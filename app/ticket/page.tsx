"use client";

import { Suspense } from "react";
import { TicketingShell } from "@/components/tickets/TicketingShell";
import { TicketsWorkspace } from "@/components/tickets/TicketsWorkspace";

export default function TicketPage() {
  return (
    <TicketingShell>
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <TicketsWorkspace />
      </Suspense>
    </TicketingShell>
  );
}
