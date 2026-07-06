"use client";

import { useMemo, useState } from "react";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { StatusSidebar } from "@/components/inbox/StatusSidebar";
import { RequestList } from "@/components/inbox/RequestList";
import { RequestDetail } from "@/components/inbox/RequestDetail";
import {
  DEFAULT_LABELS,
  LABEL_PALETTE,
  MOCK_REQUESTS,
} from "@/lib/inboxData";
import type { Label, PartRequest, RequestStatus } from "@/lib/inboxTypes";

// =============================================================
// SCHERMATA DI DEFAULT — Dashboard "unibox" after-sales.
//
// STATO: tutto in memoria con React state (nessun localStorage,
// nessun DB). In PRODUZIONE:
//   - le richieste arriverebbero dalla casella email reale del
//     cliente (IMAP / API del provider di posta);
//   - status ed etichette verrebbero persistiti su un database.
// =============================================================

export default function Home() {
  // Copie modificabili dei dati mock (lo stato vive qui, in memoria).
  const [requests, setRequests] = useState<PartRequest[]>(MOCK_REQUESTS);
  const [labels, setLabels] = useState<Label[]>(DEFAULT_LABELS);

  // Filtri e selezione UI.
  const [activeStatus, setActiveStatus] = useState<RequestStatus | "all">("all");
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"primarie" | "altre">("primarie");
  const [selectedId, setSelectedId] = useState<string | null>(
    MOCK_REQUESTS[0]?.id ?? null
  );

  // --- Mutazioni di stato (qui si collegherebbe l'API/DB in produzione) ---

  const changeStatus = (id: string, status: RequestStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
  };

  const toggleLabel = (id: string, labelId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const has = r.labelIds.includes(labelId);
        return {
          ...r,
          labelIds: has
            ? r.labelIds.filter((l) => l !== labelId)
            : [...r.labelIds, labelId],
        };
      })
    );
  };

  const createLabel = (name: string): string => {
    const id = `label-${Date.now()}`;
    const color = LABEL_PALETTE[labels.length % LABEL_PALETTE.length];
    setLabels((prev) => [...prev, { id, name, color }]);
    return id;
  };

  // --- Lista filtrata (tab + stato + etichetta + ricerca) ---

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (r.primary !== (tab === "primarie")) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (activeLabelId && !r.labelIds.includes(activeLabelId)) return false;
      if (q) {
        const haystack =
          `${r.company} ${r.from} ${r.subject} ${r.body}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, tab, activeStatus, activeLabelId, query]);

  // Contatori tab (tengono conto anche del filtro stato/etichetta/ricerca).
  const matchesFilters = (r: PartRequest) => {
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    if (activeLabelId && !r.labelIds.includes(activeLabelId)) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const haystack =
        `${r.company} ${r.from} ${r.subject} ${r.body}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };
  const primaryCount = requests.filter((r) => r.primary && matchesFilters(r)).length;
  const otherCount = requests.filter((r) => !r.primary && matchesFilters(r)).length;

  const selected =
    filtered.find((r) => r.id === selectedId) ??
    requests.find((r) => r.id === selectedId) ??
    null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />
      <div className="flex min-h-0 flex-1">
        <StatusSidebar
          requests={requests}
          labels={labels}
          activeStatus={activeStatus}
          activeLabelId={activeLabelId}
          query={query}
          onSelectStatus={setActiveStatus}
          onSelectLabel={setActiveLabelId}
          onQueryChange={setQuery}
        />
        <RequestList
          requests={filtered}
          labels={labels}
          selectedId={selected?.id ?? null}
          tab={tab}
          onSelect={setSelectedId}
          onTabChange={setTab}
          primaryCount={primaryCount}
          otherCount={otherCount}
        />
        <RequestDetail
          request={selected}
          labels={labels}
          onChangeStatus={changeStatus}
          onToggleLabel={toggleLabel}
          onCreateLabel={createLabel}
        />
      </div>
    </div>
  );
}
