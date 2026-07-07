"use client";

import { useState } from "react";
import { TechnicianAssignmentsTab } from "./TechnicianAssignmentsTab";
import { TechnicianDirectoryTab } from "./TechnicianDirectoryTab";

type Tab = "interventi" | "anagrafica";

const TABS: { id: Tab; label: string }[] = [
  { id: "interventi", label: "Interventi assegnati" },
  { id: "anagrafica", label: "Tecnici per capacità" },
];

export function TechniciansWorkspace() {
  const [tab, setTab] = useState<Tab>("anagrafica");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-surface/40 px-5">
        <div className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "relative py-3 text-sm font-medium transition-colors",
                tab === t.id ? "text-ink" : "text-ink-faint hover:text-ink-muted",
              ].join(" ")}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "interventi" ? (
        <TechnicianAssignmentsTab />
      ) : (
        <TechnicianDirectoryTab />
      )}
    </div>
  );
}
