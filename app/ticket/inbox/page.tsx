"use client";

import { TicketingShell } from "@/components/tickets/TicketingShell";
import { EmailInboxWorkspace } from "@/components/inbox/EmailInboxWorkspace";

export default function TicketingInboxPage() {
  return (
    <TicketingShell>
      <EmailInboxWorkspace />
    </TicketingShell>
  );
}
