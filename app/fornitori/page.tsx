"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { SuppliersWorkspace } from "@/components/suppliers/SuppliersWorkspace";

// Tab "Fornitori" — anagrafica, import Excel/CSV, richieste inviate.

export default function FornitoriPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <SuppliersWorkspace />
    </div>
  );
}
