"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { SettingsSidebar } from "./SettingsSidebar";

export function SettingsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <div className="flex min-h-0 flex-1">
        <SettingsSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
