"use client";

import { FeedbackWorkspace } from "@/components/reports/FeedbackWorkspace";
import { ReportsShell } from "@/components/reports/ReportsShell";

// Sotto-sezione "Feedback" — sentiment e temi ricorrenti dai rapporti.
export default function RapportiFeedbackPage() {
  return (
    <ReportsShell>
      <FeedbackWorkspace />
    </ReportsShell>
  );
}
