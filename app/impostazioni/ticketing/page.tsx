"use client";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { TicketStagesSettings } from "@/components/settings/TicketStagesSettings";
import { TicketFormEmbedSettings } from "@/components/settings/TicketFormEmbedSettings";

export default function ImpostazioniTicketingPage() {
  return (
    <SettingsShell>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TicketStagesSettings />
        <div className="mx-auto max-w-3xl px-5 pb-10 sm:px-8">
          <TicketFormEmbedSettings />
        </div>
      </div>
    </SettingsShell>
  );
}
