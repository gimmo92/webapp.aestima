"use client";

import { SettingsShell } from "@/components/settings/SettingsShell";
import { LanguageSettings } from "@/components/settings/LanguageSettings";

export default function ImpostazioniLinguaPage() {
  return (
    <SettingsShell>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <LanguageSettings />
      </div>
    </SettingsShell>
  );
}
