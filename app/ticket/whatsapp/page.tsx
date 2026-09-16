"use client";

import { TicketingShell } from "@/components/tickets/TicketingShell";
import { WhatsAppWorkspace } from "@/components/whatsapp/WhatsAppWorkspace";

export default function TicketingWhatsAppPage() {
  return (
    <TicketingShell>
      <WhatsAppWorkspace embedded />
    </TicketingShell>
  );
}
