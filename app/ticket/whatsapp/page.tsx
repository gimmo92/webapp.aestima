"use client";

import { TicketingShell } from "@/components/tickets/TicketingShell";
import { WhatsAppInbox } from "@/components/tickets/WhatsAppInbox";

export default function TicketingWhatsAppPage() {
  return (
    <TicketingShell>
      <WhatsAppInbox />
    </TicketingShell>
  );
}
