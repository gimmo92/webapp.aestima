"use client";

import { createContext, useContext, useState, useCallback } from "react";
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
import {
  MOCK_TECHNICIANS,
  MOCK_TECHNICIAN_ASSIGNMENTS,
  MOCK_INTERVENTION_REPORTS,
  newTechnicianAssignmentId,
  newTechnicianId,
} from "@/lib/technicianData";
import type {
  InterventionReport,
  Technician,
  TechnicianAssignment,
  TechnicianAssignmentStatus,
  TechnicianInput,
} from "@/lib/technicianTypes";
import {
  MOCK_TICKETS,
  newTicketId,
} from "@/lib/ticketData";
import type {
  CreateTicketInput,
  ServiceTicketRecord,
  UpdateTicketInput,
} from "@/lib/ticketTypes";

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

export interface CreateTechnicianAssignmentInput {
  partRequestId: string;
  technicianId: string;
  subject: string;
  body: string;
  machineModel?: string;
  machineSerial?: string;
  componentCode?: string;
  componentDescription?: string;
  contacted?: boolean;
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
  technicians: Technician[];
  technicianAssignments: TechnicianAssignment[];
  addTechnician: (input: TechnicianInput) => string;
  addTechnicians: (inputs: TechnicianInput[]) => number;
  createTechnicianAssignment: (input: CreateTechnicianAssignmentInput) => void;
  updateTechnicianAssignmentStatus: (
    id: string,
    status: TechnicianAssignmentStatus
  ) => void;
  getTechnicianAssignmentForRequest: (
    partRequestId: string
  ) => TechnicianAssignment | undefined;
  interventionReports: InterventionReport[];
  tickets: ServiceTicketRecord[];
  createTicket: (input: CreateTicketInput) => string;
  updateTicket: (id: string, input: UpdateTicketInput) => void;
  getTicketById: (id: string) => ServiceTicketRecord | undefined;
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
  const [technicians, setTechnicians] = useState<Technician[]>(MOCK_TECHNICIANS);
  const [technicianAssignments, setTechnicianAssignments] = useState<
    TechnicianAssignment[]
  >(MOCK_TECHNICIAN_ASSIGNMENTS);
  const [interventionReports] = useState<InterventionReport[]>(
    MOCK_INTERVENTION_REPORTS
  );
  const [tickets, setTickets] = useState<ServiceTicketRecord[]>(MOCK_TICKETS);

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

  const addTechnician = (input: TechnicianInput): string => {
    const id = newTechnicianId();
    setTechnicians((prev) => [...prev, { ...input, id }]);
    return id;
  };

  const addTechnicians = (inputs: TechnicianInput[]): number => {
    if (inputs.length === 0) return 0;
    const base = Date.now();
    const added = inputs.map((input, i) => ({
      ...input,
      id: `tech-${base}-${i}`,
    }));
    setTechnicians((prev) => [...prev, ...added]);
    return added.length;
  };

  const createTechnicianAssignment = (input: CreateTechnicianAssignmentInput) => {
    const { sentLabel, sentFull } = nowLabels();
    setTechnicianAssignments((prev) => {
      const without = prev.filter((a) => a.partRequestId !== input.partRequestId);
      const row: TechnicianAssignment = {
        id: newTechnicianAssignmentId(),
        partRequestId: input.partRequestId,
        technicianId: input.technicianId,
        status: input.contacted ? "contattato" : "bozza",
        subject: input.subject,
        body: input.body,
        machineModel: input.machineModel,
        machineSerial: input.machineSerial,
        componentCode: input.componentCode,
        componentDescription: input.componentDescription,
        assignedLabel: sentLabel,
        assignedFull: sentFull,
      };
      return [row, ...without];
    });
  };

  const updateTechnicianAssignmentStatus = (
    id: string,
    status: TechnicianAssignmentStatus
  ) => {
    setTechnicianAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
  };

  const getTechnicianAssignmentForRequest = useCallback(
    (partRequestId: string) =>
      technicianAssignments.find((a) => a.partRequestId === partRequestId),
    [technicianAssignments]
  );

  const createTicket = useCallback((input: CreateTicketInput): string => {
    const { sentLabel, sentFull } = nowLabels();
    const id = input.id?.trim() || newTicketId();
    setTickets((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      const row: ServiceTicketRecord = {
        id,
        status: "aperto",
        priority: input.priority ?? "normale",
        source: input.source,
        category: input.category ?? "altro",
        summary: input.summary.trim(),
        description: (input.description ?? input.summary).trim(),
        machineModel: input.machineModel,
        machineSerial: input.machineSerial,
        createdLabel: sentLabel,
        createdFull: sentFull,
        updatedFull: sentFull,
      };
      return [row, ...prev];
    });
    return id;
  }, []);

  const updateTicket = useCallback((id: string, input: UpdateTicketInput) => {
    const { sentFull } = nowLabels();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const next: ServiceTicketRecord = {
          ...t,
          updatedFull: sentFull,
        };
        if (input.status !== undefined) next.status = input.status;
        if (input.priority !== undefined) next.priority = input.priority;
        if (input.internalNotes !== undefined)
          next.internalNotes = input.internalNotes;
        if (input.description !== undefined)
          next.description = input.description;
        if (input.assignedTechnicianId !== undefined) {
          next.assignedTechnicianId =
            input.assignedTechnicianId ?? undefined;
          if (input.assignedTechnicianId && next.status === "aperto") {
            next.status = "assegnato";
          }
        }
        return next;
      })
    );
  }, []);

  const getTicketById = useCallback(
    (id: string) => tickets.find((t) => t.id === id),
    [tickets]
  );

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
        technicians,
        technicianAssignments,
        addTechnician,
        addTechnicians,
        createTechnicianAssignment,
        updateTechnicianAssignmentStatus,
        getTechnicianAssignmentForRequest,
        interventionReports,
        tickets,
        createTicket,
        updateTicket,
        getTicketById,
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
