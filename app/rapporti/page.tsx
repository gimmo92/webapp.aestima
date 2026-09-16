"use client";

import { Suspense } from "react";
import { ReportsShell } from "@/components/reports/ReportsShell";
import { ReportsWorkspace } from "@/components/reports/ReportsWorkspace";

// Tab "Rapporti" — rapporti d'intervento generati dalle chat con i tecnici.
export default function RapportiPage() {
  return (
    <ReportsShell>
      <Suspense fallback={<div className="min-h-0 flex-1" />}>
        <ReportsWorkspace />
      </Suspense>
    </ReportsShell>
  );
}
