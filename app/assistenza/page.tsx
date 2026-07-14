"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ServiceChatWorkspace } from "@/components/service-chat/ServiceChatWorkspace";

// Pagina dedicata alla chat di assistenza service after-sales.
// Layout full-height, ottimizzato per demo su desktop/proiettore.

export default function AssistenzaPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <ServiceChatWorkspace />
    </div>
  );
}
