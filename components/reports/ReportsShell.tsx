"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { ReportsSidebar } from "./ReportsSidebar";

export function ReportsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <div className="flex min-h-0 flex-1">
        <ReportsSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
