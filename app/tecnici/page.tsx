"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { TechniciansWorkspace } from "@/components/technicians/TechniciansWorkspace";

export default function TecniciPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <TechniciansWorkspace />
    </div>
  );
}
