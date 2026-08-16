"use client";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { TicketStagesSettings } from "@/components/settings/TicketStagesSettings";

export default function ImpostazioniTicketingPage() {
  return (
    <SettingsShell>
      <TicketStagesSettings />
    </SettingsShell>
  );
}
