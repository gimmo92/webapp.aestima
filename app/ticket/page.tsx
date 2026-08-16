"use client";

import { TicketingShell } from "@/components/tickets/TicketingShell";
import { TicketDashboard } from "@/components/tickets/TicketDashboard";

export default function TicketPage() {
  return (
    <TicketingShell>
      <TicketDashboard />
    </TicketingShell>
  );
}
