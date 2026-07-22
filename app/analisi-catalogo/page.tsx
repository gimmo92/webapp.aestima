"use client";

import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { CatalogAnalysisWorkspace } from "@/components/catalog-analysis/CatalogAnalysisWorkspace";

export default function AnalisiCatalogoPage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <CatalogAnalysisWorkspace />
    </div>
  );
}
