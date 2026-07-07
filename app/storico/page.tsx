"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { OfferHistoryWorkspace } from "@/components/offers/OfferHistoryWorkspace";

// Tab "Storico offerte" — elenco offerte inviate con esito (accettata / rifiutata / in attesa).

export default function StoricoOffertePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <OfferHistoryWorkspace />
    </div>
  );
}
