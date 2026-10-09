"use client";

import { Suspense } from "react";
import { TicketingShell } from "@/components/tickets/TicketingShell";
import { CallsWorkspace } from "@/components/tickets/CallsWorkspace";

export default function TicketCallsPage() {
  return (
    <TicketingShell>
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <CallsWorkspace />
      </Suspense>
    </TicketingShell>
  );
}
