"use client";

import { createContext, useContext, useState } from "react";
import {
  DEFAULT_LABELS,
  LABEL_PALETTE,
  MOCK_REQUESTS,
} from "@/lib/inboxData";
import type { Label, PartRequest, RequestStatus } from "@/lib/inboxTypes";
import {
  MOCK_SUPPLIERS,
  MOCK_SUPPLIER_REQUESTS,
  newSupplierId,
  newSupplierRequestId,
} from "@/lib/supplierData";
import type {
  Supplier,
  SupplierInput,
  SupplierRequest,
  SupplierRequestStatus,
} from "@/lib/supplierTypes";

// =============================================================
// Stato condiviso della dashboard (inbox, pipeline, fornitori).
//
// Vive in memoria con React state. In PRODUZIONE qui si collegherebbe
// l'API/DB, la casella email e il modulo acquisti/fornitori.
// =============================================================

export interface CreateSupplierRequestInput {
  partRequestId: string;
  supplierIds: string[];
  subject: string;
  body: string;
  componentCode: string;
  componentDescription: string;
  machineModel: string;
  machineSerial: string;
}

interface InboxContextValue {
  requests: PartRequest[];
  labels: Label[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  changeStatus: (id: string, status: RequestStatus) => void;
  toggleLabel: (id: string, labelId: string) => void;
  createLabel: (name: string) => string;
  suppliers: Supplier[];
  supplierRequests: SupplierRequest[];
  addSupplier: (input: SupplierInput) => string;
  addSuppliers: (inputs: SupplierInput[]) => number;
  createSupplierRequests: (input: CreateSupplierRequestInput) => void;
  updateSupplierRequestStatus: (
    id: string,
    status: SupplierRequestStatus
  ) => void;
}

const InboxContext = createContext<InboxContextValue | null>(null);

function nowLabels() {
  const d = new Date();
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return {
    sentLabel: `${String(h).padStart(2, "0")}:${m}`,
    sentFull: `Oggi, ${String(h).padStart(2, "0")}:${m}`,
  };
}

export function InboxProvider({ children }: { children: React.ReactNode }) {
  const [requests, setRequests] = useState<PartRequest[]>(MOCK_REQUESTS);
  const [labels, setLabels] = useState<Label[]>(DEFAULT_LABELS);
  const [selectedId, setSelectedId] = useState<string | null>(
    MOCK_REQUESTS[0]?.id ?? null
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [supplierRequests, setSupplierRequests] = useState<SupplierRequest[]>(
    MOCK_SUPPLIER_REQUESTS
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

  const addSupplier = (input: SupplierInput): string => {
    const id = newSupplierId();
    setSuppliers((prev) => [...prev, { ...input, id }]);
    return id;
  };

  const addSuppliers = (inputs: SupplierInput[]): number => {
    if (inputs.length === 0) return 0;
    const base = Date.now();
    const added = inputs.map((input, i) => ({
      ...input,
      id: `sup-${base}-${i}`,
    }));
    setSuppliers((prev) => [...prev, ...added]);
    return added.length;
  };

  const createSupplierRequests = (input: CreateSupplierRequestInput) => {
    const { sentLabel, sentFull } = nowLabels();
    const rows: SupplierRequest[] = input.supplierIds.map((supplierId) => ({
      id: newSupplierRequestId(),
      partRequestId: input.partRequestId,
      supplierId,
      status: "inviata",
      subject: input.subject,
      body: input.body,
      componentCode: input.componentCode,
      componentDescription: input.componentDescription,
      machineModel: input.machineModel,
      machineSerial: input.machineSerial,
      sentLabel,
      sentFull,
    }));
    setSupplierRequests((prev) => [...rows, ...prev]);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === input.partRequestId ? { ...r, status: "attesa_fornitore" } : r
      )
    );
  };

  const updateSupplierRequestStatus = (
    id: string,
    status: SupplierRequestStatus
  ) => {
    setSupplierRequests((prev) =>
      prev.map((sr) => (sr.id === id ? { ...sr, status } : sr))
    );
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
        suppliers,
        supplierRequests,
        addSupplier,
        addSuppliers,
        createSupplierRequests,
        updateSupplierRequestStatus,
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
