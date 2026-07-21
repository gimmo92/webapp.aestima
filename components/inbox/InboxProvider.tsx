"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { LABEL_PALETTE } from "@/lib/inboxData";
import type { Label, PartRequest, RequestStatus } from "@/lib/inboxTypes";
import {
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
import { newKnowledgeId } from "@/lib/knowledgeData";
import type { KnowledgeEntry } from "@/lib/knowledgeTypes";
import { newConversationId } from "@/lib/conversationData";
import {
  CONVERSATIONS_STORAGE_KEY,
  loadStoredConversations,
  saveStoredConversations,
} from "@/lib/conversationStorage";
import type {
  AppendConversationMessageInput,
  ConversationRecord,
  CreateConversationInput,
  UpdateConversationInput,
} from "@/lib/conversationTypes";
import { newTicketId } from "@/lib/ticketData";
import type {
  CreateTicketInput,
  ServiceTicketRecord,
  UpdateTicketInput,
} from "@/lib/ticketTypes";
import { persistWorkspace } from "@/lib/workspace/persistClient";

// =============================================================
// Stato condiviso della dashboard.
// Loggato: dati company da Supabase (vuoti finché non li crei).
// Ospite: stato vuoto + eventuale localStorage chat.
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
  conversations: ConversationRecord[];
  createConversation: (input: CreateConversationInput) => string;
  updateConversation: (id: string, input: UpdateConversationInput) => void;
  appendConversationMessage: (
    id: string,
    input: AppendConversationMessageInput
  ) => void;
  takeOverConversation: (id: string, operatorId: string) => void;
  resolveConversation: (id: string) => void;
  getConversationById: (id: string) => ConversationRecord | undefined;
  knowledgeBase: KnowledgeEntry[];
  addKnowledgeEntry: (
    input: Omit<
      KnowledgeEntry,
      | "id"
      | "frequency"
      | "consolidated"
      | "createdLabel"
      | "createdFull"
      | "updatedFull"
    > & { frequency?: number; sourceTicketId?: string }
  ) => string;
  incrementKnowledgeFrequency: (id: string) => void;
  consolidateKnowledgeEntries: (
    entryIds: string[],
    merged: Omit<
      KnowledgeEntry,
      | "id"
      | "consolidated"
      | "mergedFromIds"
      | "createdLabel"
      | "createdFull"
      | "updatedFull"
    >
  ) => string;
  removeKnowledgeEntries: (ids: string[]) => void;
  getKnowledgeEntryById: (id: string) => KnowledgeEntry | undefined;
  findSimilarKnowledgeEntries: (
    machineModel: string,
    symptom: string
  ) => KnowledgeEntry[];
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
  const [requests, setRequests] = useState<PartRequest[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierRequests, setSupplierRequests] = useState<SupplierRequest[]>(
    []
  );
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [technicianAssignments, setTechnicianAssignments] = useState<
    TechnicianAssignment[]
  >([]);
  const [interventionReports, setInterventionReports] = useState<
    InterventionReport[]
  >([]);
  const [tickets, setTickets] = useState<ServiceTicketRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const conversationsHydratedRef = useRef(false);
  const cloudModeRef = useRef(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workspace");
        if (!res.ok) {
          // Ospite: localStorage conversazioni se presente
          const stored = loadStoredConversations();
          if (!cancelled) {
            if (stored) setConversations(stored);
            conversationsHydratedRef.current = true;
            cloudModeRef.current = false;
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        cloudModeRef.current = true;
        setLabels(data.labels ?? []);
        setRequests(data.requests ?? []);
        setConversations(data.conversations ?? []);
        setKnowledgeBase(data.knowledgeBase ?? []);
        setTickets(data.tickets ?? []);
        setSuppliers(data.suppliers ?? []);
        setSupplierRequests(data.supplierRequests ?? []);
        setTechnicians(data.technicians ?? []);
        setTechnicianAssignments(data.technicianAssignments ?? []);
        setInterventionReports(data.interventionReports ?? []);
        setSelectedId(data.requests?.[0]?.id ?? null);
        conversationsHydratedRef.current = true;
      } catch {
        if (!cancelled) {
          conversationsHydratedRef.current = true;
          cloudModeRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!conversationsHydratedRef.current) return;
    if (cloudModeRef.current) return; // cloud: niente localStorage
    saveStoredConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (cloudModeRef.current) return;
      if (event.key !== CONVERSATIONS_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (!Array.isArray(parsed)) return;
        setConversations(parsed as ConversationRecord[]);
      } catch {
        // Ignora payload corrotto da altre tab.
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((action: string, payload: unknown) => {
    if (!cloudModeRef.current) return;
    persistWorkspace(action, payload);
  }, []);

  const changeStatus = (id: string, status: RequestStatus) => {
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    persist("changeStatus", { id, status });
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
    persist("toggleLabel", { id, labelId });
  };

  const createLabel = (name: string): string => {
    const id = `label-${Date.now()}`;
    const color = LABEL_PALETTE[labels.length % LABEL_PALETTE.length];
    setLabels((prev) => [...prev, { id, name, color }]);
    persist("createLabel", { id, name, color });
    return id;
  };

  const addSupplier = (input: SupplierInput): string => {
    const id = newSupplierId();
    setSuppliers((prev) => [...prev, { ...input, id }]);
    persist("addSupplier", { id, ...input });
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
    for (const row of added) persist("addSupplier", row);
    return added.length;
  };

  const createSupplierRequests = (input: CreateSupplierRequestInput) => {
    const { sentLabel, sentFull } = nowLabels();
    const rows: SupplierRequest[] = input.supplierIds.map((supplierId) => ({
      id: newSupplierRequestId(),
      partRequestId: input.partRequestId,
      supplierId,
      status: "inviata" as const,
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
    persist("createSupplierRequests", {
      partRequestId: input.partRequestId,
      rows,
    });
  };

  const updateSupplierRequestStatus = (
    id: string,
    status: SupplierRequestStatus
  ) => {
    setSupplierRequests((prev) =>
      prev.map((sr) => (sr.id === id ? { ...sr, status } : sr))
    );
    persist("updateSupplierRequestStatus", { id, status });
  };

  const addTechnician = (input: TechnicianInput): string => {
    const id = newTechnicianId();
    setTechnicians((prev) => [...prev, { ...input, id }]);
    persist("addTechnician", { id, ...input });
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
    for (const row of added) persist("addTechnician", row);
    return added.length;
  };

  const createTechnicianAssignment = (input: CreateTechnicianAssignmentInput) => {
    const { sentLabel, sentFull } = nowLabels();
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
    setTechnicianAssignments((prev) => {
      const without = prev.filter((a) => a.partRequestId !== input.partRequestId);
      return [row, ...without];
    });
    persist("createTechnicianAssignment", row);
  };

  const updateTechnicianAssignmentStatus = (
    id: string,
    status: TechnicianAssignmentStatus
  ) => {
    setTechnicianAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a))
    );
    persist("updateTechnicianAssignmentStatus", { id, status });
  };

  const getTechnicianAssignmentForRequest = useCallback(
    (partRequestId: string) =>
      technicianAssignments.find((a) => a.partRequestId === partRequestId),
    [technicianAssignments]
  );

  const createTicket = useCallback(
    (input: CreateTicketInput): string => {
      const { sentLabel, sentFull } = nowLabels();
      const id = input.id?.trim() || newTicketId();
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
      setTickets((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        return [row, ...prev];
      });
      persist("createTicket", row);
      return id;
    },
    [persist]
  );

  const updateTicket = useCallback(
    (id: string, input: UpdateTicketInput) => {
      const { sentFull } = nowLabels();
      let nextRow: ServiceTicketRecord | null = null;
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
          if (input.solution !== undefined) next.solution = input.solution;
          if (input.knowledgeEntryId !== undefined)
            next.knowledgeEntryId = input.knowledgeEntryId;
          if (input.assignedTechnicianId !== undefined) {
            next.assignedTechnicianId =
              input.assignedTechnicianId ?? undefined;
            if (input.assignedTechnicianId && next.status === "aperto") {
              next.status = "assegnato";
            }
          }
          nextRow = next;
          return next;
        })
      );
      if (nextRow) persist("updateTicket", { ...(nextRow as object), id });
    },
    [persist]
  );

  const getTicketById = useCallback(
    (id: string) => tickets.find((t) => t.id === id),
    [tickets]
  );

  const createConversation = useCallback(
    (input: CreateConversationInput): string => {
      const { sentLabel, sentFull } = nowLabels();
      const id = newConversationId();
      const initial = input.initialMessages ?? [];
      const last = initial[initial.length - 1];
      const row: ConversationRecord = {
        id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        status: "aperto",
        assignee: input.assignee ?? "ai",
        assignedOperatorId: input.assignedOperatorId,
        channel: input.channel,
        lastMessagePreview: last?.content.slice(0, 80) ?? "Nuova conversazione",
        lastMessageLabel: last?.timestampLabel ?? sentLabel,
        createdFull: sentFull,
        updatedFull: sentFull,
        messages: initial,
        machineModel: input.machineModel,
        machineSerial: input.machineSerial,
        ticketId: input.ticketId,
        visitorOnline: input.channel !== "inbox",
      };
      setConversations((prev) => [row, ...prev]);
      persist("createConversation", row);
      return id;
    },
    [persist]
  );

  const updateConversation = useCallback(
    (id: string, input: UpdateConversationInput) => {
      const { sentLabel, sentFull } = nowLabels();
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const next: ConversationRecord = {
            ...c,
            updatedFull: sentFull,
            lastMessageLabel: sentLabel,
          };
          if (input.status !== undefined) next.status = input.status;
          if (input.assignee !== undefined) next.assignee = input.assignee;
          if (input.assignedOperatorId !== undefined) {
            next.assignedOperatorId =
              input.assignedOperatorId ?? undefined;
          }
          if (input.customerName !== undefined)
            next.customerName = input.customerName;
          if (input.machineModel !== undefined)
            next.machineModel = input.machineModel;
          if (input.machineSerial !== undefined)
            next.machineSerial = input.machineSerial;
          if (input.ticketId !== undefined) next.ticketId = input.ticketId;
          if (input.visitorOnline !== undefined)
            next.visitorOnline = input.visitorOnline;
          return next;
        })
      );
      persist("updateConversation", {
        id,
        ...input,
        lastMessageLabel: sentLabel,
        updatedFull: sentFull,
      });
    },
    [persist]
  );

  const appendConversationMessage = useCallback(
    (id: string, input: AppendConversationMessageInput) => {
      const { sentLabel, sentFull } = nowLabels();
      const message = {
        id: `msg-${Date.now()}`,
        role: input.role,
        content: input.content,
        timestampLabel: sentLabel,
        spareParts: input.spareParts,
        ticket: input.ticket,
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          return {
            ...c,
            messages: [...c.messages, message],
            lastMessagePreview: input.content.slice(0, 80),
            lastMessageLabel: sentLabel,
            updatedFull: sentFull,
          };
        })
      );
      persist("appendConversationMessage", {
        id,
        message,
        updatedFull: sentFull,
      });
    },
    [persist]
  );

  const takeOverConversation = useCallback(
    (id: string, operatorId: string) => {
      const { sentLabel, sentFull } = nowLabels();
      const notice = {
        id: `msg-${Date.now()}`,
        role: "agent" as const,
        content: "Stai parlando con un agente umano.",
        timestampLabel: sentLabel,
      };
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          if (c.assignee === "operatore") return c;
          return {
            ...c,
            assignee: "operatore" as const,
            assignedOperatorId: operatorId,
            messages: [...c.messages, notice],
            lastMessagePreview: notice.content.slice(0, 80),
            lastMessageLabel: sentLabel,
            updatedFull: sentFull,
          };
        })
      );
      persist("takeOverConversation", {
        id,
        operatorId,
        notice,
        updatedFull: sentFull,
      });
    },
    [persist]
  );

  const resolveConversation = useCallback((id: string) => {
    updateConversation(id, { status: "risolto", visitorOnline: false });
  }, [updateConversation]);

  const getConversationById = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  const addKnowledgeEntry = useCallback(
    (
      input: Omit<
        KnowledgeEntry,
        | "id"
        | "frequency"
        | "consolidated"
        | "createdLabel"
        | "createdFull"
        | "updatedFull"
      > & { frequency?: number; sourceTicketId?: string }
    ): string => {
      const { sentLabel, sentFull } = nowLabels();
      const id = newKnowledgeId();
      const similar = knowledgeBase.find(
        (e) =>
          e.machineModel === input.machineModel &&
          e.symptom.toLowerCase().includes(
            input.symptom.slice(0, 40).toLowerCase()
          )
      );
      if (similar) {
        const next = {
          ...similar,
          frequency: similar.frequency + 1,
          updatedFull: sentFull,
          solution: input.solution,
          probableCause: input.probableCause,
        };
        setKnowledgeBase((prev) =>
          prev.map((e) => (e.id === similar.id ? next : e))
        );
        persist("upsertKnowledgeEntry", next);
        return similar.id;
      }
      const row: KnowledgeEntry = {
        ...input,
        id,
        frequency: input.frequency ?? 1,
        consolidated: false,
        sourceTicketId: input.sourceTicketId,
        createdLabel: sentLabel,
        createdFull: sentFull,
        updatedFull: sentFull,
      };
      setKnowledgeBase((prev) => [row, ...prev]);
      persist("upsertKnowledgeEntry", row);
      return id;
    },
    [knowledgeBase, persist]
  );

  const incrementKnowledgeFrequency = useCallback(
    (id: string) => {
      const { sentFull } = nowLabels();
      setKnowledgeBase((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, frequency: e.frequency + 1, updatedFull: sentFull }
            : e
        )
      );
      persist("incrementKnowledgeFrequency", { id, updatedFull: sentFull });
    },
    [persist]
  );

  const consolidateKnowledgeEntries = useCallback(
    (
      entryIds: string[],
      merged: Omit<
        KnowledgeEntry,
        | "id"
        | "consolidated"
        | "mergedFromIds"
        | "createdLabel"
        | "createdFull"
        | "updatedFull"
      >
    ): string => {
      const { sentLabel, sentFull } = nowLabels();
      const id = newKnowledgeId();
      const row: KnowledgeEntry = {
        ...merged,
        id,
        consolidated: true,
        mergedFromIds: entryIds,
        createdLabel: sentLabel,
        createdFull: sentFull,
        updatedFull: sentFull,
      };
      setKnowledgeBase((prev) => [
        row,
        ...prev.filter((e) => !entryIds.includes(e.id)),
      ]);
      persist("consolidateKnowledge", {
        id,
        entryIds,
        merged: row,
        createdLabel: sentLabel,
        createdFull: sentFull,
        updatedFull: sentFull,
      });
      return id;
    },
    [persist]
  );

  const removeKnowledgeEntries = useCallback(
    (ids: string[]) => {
      setKnowledgeBase((prev) => prev.filter((e) => !ids.includes(e.id)));
      persist("removeKnowledgeEntries", { ids });
    },
    [persist]
  );

  const getKnowledgeEntryById = useCallback(
    (id: string) => knowledgeBase.find((e) => e.id === id),
    [knowledgeBase]
  );

  const findSimilarKnowledgeEntries = useCallback(
    (machineModel: string, symptom: string) => {
      const q = symptom.toLowerCase().slice(0, 30);
      return knowledgeBase.filter(
        (e) =>
          e.machineModel === machineModel &&
          (e.symptom.toLowerCase().includes(q) ||
            q.includes(e.symptom.toLowerCase().slice(0, 20)))
      );
    },
    [knowledgeBase]
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
        conversations,
        createConversation,
        updateConversation,
        appendConversationMessage,
        takeOverConversation,
        resolveConversation,
        getConversationById,
        knowledgeBase,
        addKnowledgeEntry,
        incrementKnowledgeFrequency,
        consolidateKnowledgeEntries,
        removeKnowledgeEntries,
        getKnowledgeEntryById,
        findSimilarKnowledgeEntries,
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
