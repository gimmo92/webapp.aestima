"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { InstallerChat } from "@/components/installer/InstallerChat";

export default function InstallatoriPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <InstallerChat />
    </div>
  );
}
