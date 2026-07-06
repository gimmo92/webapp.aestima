"use client";

import { createContext, useContext, useState } from "react";
import {
  DEFAULT_LABELS,
  LABEL_PALETTE,
  MOCK_REQUESTS,
} from "@/lib/inboxData";
import type { Label, PartRequest, RequestStatus } from "@/lib/inboxTypes";

// =============================================================
// Stato condiviso della dashboard (inbox + pipeline).
//
// Vive in memoria con React state, così inbox e pipeline vedono
// gli stessi dati (es. spostando un'offerta nella pipeline cambia
// anche lo stato nell'inbox). In PRODUZIONE qui si collegherebbe
// l'API/DB e la casella email reale.
// =============================================================

interface InboxContextValue {
  requests: PartRequest[];
  labels: Label[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  changeStatus: (id: string, status: RequestStatus) => void;
  toggleLabel: (id: string, labelId: string) => void;
  createLabel: (name: string) => string;
}

const InboxContext = createContext<InboxContextValue | null>(null);

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<PartRequest[]>(MOCK_REQUESTS);
  const [labels, setLabels] = useState<Label[]>(DEFAULT_LABELS);
  const [selectedId, setSelectedId] = useState<string | null>(
    MOCK_REQUESTS[0]?.id ?? null
  );

  const changeStatus = (id: string, status: RequestStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
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

  return (
    <InboxContext.Provider
      value={{
        requests,
        labels,
        selectedId,
        setSelectedId,
        changeStatus,
        toggleLabel,
        createLabel,
      }}
    >
      {children}
    </InboxContext.Provider>
  );
}

export function useInbox(): InboxContextValue {
  const ctx = useContext(InboxContext);
  if (!ctx) {
    throw new Error("useInbox deve essere usato dentro <InboxProvider>");
  }
  return ctx;
}
