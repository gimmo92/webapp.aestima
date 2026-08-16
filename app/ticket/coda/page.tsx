"use client";

import { TicketingShell } from "@/components/tickets/TicketingShell";
import { TicketQueueBoard } from "@/components/tickets/TicketQueueBoard";

export default function TicketQueuePage() {
  return (
    <TicketingShell>
      <TicketQueueBoard />
    </TicketingShell>
  );
}
