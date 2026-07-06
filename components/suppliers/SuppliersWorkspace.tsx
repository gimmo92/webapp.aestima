"use client";

import { useState } from "react";
import { SupplierRequestsTab } from "./SupplierRequestsTab";
import { SupplierDirectoryTab } from "./SupplierDirectoryTab";

// Workspace tab Fornitori: tab iniziale "Richieste inviate" + "Anagrafica".

type Tab = "richieste" | "anagrafica";

const TABS: { id: Tab; label: string }[] = [
  { id: "richieste", label: "Richieste inviate" },
  { id: "anagrafica", label: "Anagrafica fornitori" },
];

export function SuppliersWorkspace() {
  const [tab, setTab] = useState<Tab>("richieste");

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

      {tab === "richieste" ? <SupplierRequestsTab /> : <SupplierDirectoryTab />}
    </div>
  );
}
