"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";

// Tab "Rapporti" — rapporti d'intervento generati dalle chat con i tecnici.
export default function RapportiPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <ReportsWorkspace />
    </div>
  );
}
