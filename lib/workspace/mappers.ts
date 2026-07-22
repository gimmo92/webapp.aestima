import type { Prisma } from "@/lib/generated/prisma/client";
import type { Label, PartRequest } from "@/lib/inboxTypes";
import type { ConversationRecord } from "@/lib/conversationTypes";
import type { KnowledgeEntry } from "@/lib/knowledgeTypes";
import type { ServiceTicketRecord } from "@/lib/ticketTypes";
import type { Supplier, SupplierRequest } from "@/lib/supplierTypes";
import type {
  InterventionReport,
  Technician,
  TechnicianAssignment,
} from "@/lib/technicianTypes";
import type {
  FileClassification,
  FileExt,
  SourceFile,
} from "@/lib/archiveTypes";
import type {
  SparePart,
  SparePartSource,
  SparePartStatus,
  SparePartSuccedaneo,
} from "@/lib/sparePartTypes";
import { computeSpareCompleteness } from "@/lib/sparePartTypes";

type DbLabel = {
  id: string;
  name: string;
  color: string;
};

type DbPartRequest = {
  id: string;
  fromName: string;
  fromEmail: string;
  customerCompany: string;
  subject: string;
  body: string;
  status: string;
  primary: boolean;
  receivedLabel: string;
  receivedFull: string;
  attachmentsJson: Prisma.JsonValue | null;
  labels: { labelId: string }[];
};

type DbConversation = {
  id: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  assignee: string;
  assignedOperatorId: string | null;
  channel: string;
  lastMessagePreview: string;
  lastMessageLabel: string;
  machineModel: string | null;
  machineSerial: string | null;
  ticketId: string | null;
  visitorOnline: boolean;
  createdFull: string;
  updatedFull: string;
  messages: {
    id: string;
    role: string;
    content: string;
    timestampLabel: string;
    sparePartsJson: Prisma.JsonValue | null;
    ticketJson: Prisma.JsonValue | null;
  }[];
};

export function mapLabel(row: DbLabel): Label {
  return { id: row.id, name: row.name, color: row.color };
}

export function mapPartRequest(row: DbPartRequest): PartRequest {
  return {
    id: row.id,
    from: row.fromName,
    fromEmail: row.fromEmail,
    company: row.customerCompany,
    subject: row.subject,
    body: row.body,
    status: row.status as PartRequest["status"],
    primary: row.primary,
    receivedLabel: row.receivedLabel,
    receivedFull: row.receivedFull,
    labelIds: row.labels.map((l) => l.labelId),
    attachments:
      (row.attachmentsJson as unknown as PartRequest["attachments"]) ??
      undefined,
  };
}

export function mapConversation(row: DbConversation): ConversationRecord {
  return {
    id: row.id,
    customerName: row.customerName,
    customerEmail: row.customerEmail ?? undefined,
    status: row.status as ConversationRecord["status"],
    assignee: row.assignee as ConversationRecord["assignee"],
    assignedOperatorId: row.assignedOperatorId ?? undefined,
    channel: row.channel as ConversationRecord["channel"],
    lastMessagePreview: row.lastMessagePreview,
    lastMessageLabel: row.lastMessageLabel,
    createdFull: row.createdFull,
    updatedFull: row.updatedFull,
    machineModel: row.machineModel ?? undefined,
    machineSerial: row.machineSerial ?? undefined,
    ticketId: row.ticketId ?? undefined,
    visitorOnline: row.visitorOnline,
    messages: row.messages.map((m) => ({
      id: m.id,
      role: m.role as ConversationRecord["messages"][number]["role"],
      content: m.content,
      timestampLabel: m.timestampLabel,
      spareParts:
        (m.sparePartsJson as unknown as ConversationRecord["messages"][number]["spareParts"]) ??
        undefined,
      ticket:
        (m.ticketJson as unknown as ConversationRecord["messages"][number]["ticket"]) ??
        undefined,
    })),
  };
}

export function mapKnowledge(row: {
  id: string;
  machineModel: string;
  machineSerial: string | null;
  problemCategory: string;
  symptom: string;
  probableCause: string;
  solution: string;
  sparePartsJson: Prisma.JsonValue;
  frequency: number;
  sourceTicketId: string | null;
  consolidated: boolean;
  mergedFromIds: string[];
  tags: string[];
  createdLabel: string;
  createdFull: string;
  updatedFull: string;
}): KnowledgeEntry {
  return {
    id: row.id,
    machineModel: row.machineModel,
    machineSerial: row.machineSerial ?? undefined,
    problemCategory: row.problemCategory as KnowledgeEntry["problemCategory"],
    symptom: row.symptom,
    probableCause: row.probableCause,
    solution: row.solution,
    spareParts:
      (row.sparePartsJson as unknown as KnowledgeEntry["spareParts"]) ?? [],
    frequency: row.frequency,
    sourceTicketId: row.sourceTicketId ?? undefined,
    consolidated: row.consolidated,
    mergedFromIds: row.mergedFromIds.length ? row.mergedFromIds : undefined,
    tags: row.tags,
    createdLabel: row.createdLabel,
    createdFull: row.createdFull,
    updatedFull: row.updatedFull,
  };
}

export function mapTicket(row: {
  id: string;
  status: string;
  priority: string;
  source: string;
  category: string;
  summary: string;
  description: string;
  machineModel: string | null;
  machineSerial: string | null;
  assignedTechnicianId: string | null;
  internalNotes: string | null;
  solution: string | null;
  knowledgeEntryId: string | null;
  createdLabel: string;
  createdFull: string;
  updatedFull: string;
}): ServiceTicketRecord {
  return {
    id: row.id,
    status: row.status as ServiceTicketRecord["status"],
    priority: row.priority as ServiceTicketRecord["priority"],
    source: row.source as ServiceTicketRecord["source"],
    category: row.category as ServiceTicketRecord["category"],
    summary: row.summary,
    description: row.description,
    machineModel: row.machineModel ?? undefined,
    machineSerial: row.machineSerial ?? undefined,
    assignedTechnicianId: row.assignedTechnicianId ?? undefined,
    internalNotes: row.internalNotes ?? undefined,
    solution: row.solution ?? undefined,
    knowledgeEntryId: row.knowledgeEntryId ?? undefined,
    createdLabel: row.createdLabel,
    createdFull: row.createdFull,
    updatedFull: row.updatedFull,
  };
}

export function mapSupplier(row: {
  id: string;
  name: string;
  email: string;
  contact: string | null;
  categories: string[];
  notes: string | null;
}): Supplier {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    contact: row.contact ?? undefined,
    categories: row.categories,
    notes: row.notes ?? undefined,
  };
}

export function mapSupplierRequest(row: {
  id: string;
  partRequestId: string;
  supplierId: string;
  status: string;
  subject: string;
  body: string;
  componentCode: string;
  componentDescription: string;
  machineModel: string;
  machineSerial: string;
  sentLabel: string;
  sentFull: string;
}): SupplierRequest {
  return {
    id: row.id,
    partRequestId: row.partRequestId,
    supplierId: row.supplierId,
    status: row.status as SupplierRequest["status"],
    subject: row.subject,
    body: row.body,
    componentCode: row.componentCode,
    componentDescription: row.componentDescription,
    machineModel: row.machineModel,
    machineSerial: row.machineSerial,
    sentLabel: row.sentLabel,
    sentFull: row.sentFull,
  };
}

export function mapTechnician(row: {
  id: string;
  name: string;
  email: string;
  phone: string;
  capabilities: string[];
  region: string | null;
  notes: string | null;
}): Technician {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    capabilities: row.capabilities,
    region: row.region ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export function mapAssignment(row: {
  id: string;
  partRequestId: string;
  technicianId: string;
  status: string;
  subject: string;
  body: string;
  machineModel: string | null;
  machineSerial: string | null;
  componentCode: string | null;
  componentDescription: string | null;
  assignedLabel: string;
  assignedFull: string;
}): TechnicianAssignment {
  return {
    id: row.id,
    partRequestId: row.partRequestId,
    technicianId: row.technicianId,
    status: row.status as TechnicianAssignment["status"],
    subject: row.subject,
    body: row.body,
    machineModel: row.machineModel ?? undefined,
    machineSerial: row.machineSerial ?? undefined,
    componentCode: row.componentCode ?? undefined,
    componentDescription: row.componentDescription ?? undefined,
    assignedLabel: row.assignedLabel,
    assignedFull: row.assignedFull,
  };
}

export function mapReport(row: {
  id: string;
  reportNumber: string;
  machineSerial: string;
  machineModel: string;
  technicianId: string;
  interventionDate: string;
  interventionDateFull: string;
  type: string;
  outcome: string;
  hours: number;
  summary: string;
  workPerformed: string;
  partsUsedJson: Prisma.JsonValue | null;
  customerCompany: string | null;
  assignmentId: string | null;
}): InterventionReport {
  return {
    id: row.id,
    reportNumber: row.reportNumber,
    machineSerial: row.machineSerial,
    machineModel: row.machineModel,
    technicianId: row.technicianId,
    interventionDate: row.interventionDate,
    interventionDateFull: row.interventionDateFull,
    type: row.type as InterventionReport["type"],
    outcome: row.outcome as InterventionReport["outcome"],
    hours: row.hours,
    summary: row.summary,
    workPerformed: row.workPerformed,
    partsUsed: (row.partsUsedJson as string[]) ?? undefined,
    customerCompany: row.customerCompany ?? undefined,
    assignmentId: row.assignmentId ?? undefined,
  };
}

function canPreviewExt(ext: string) {
  return ext === "xlsx" || ext === "pdf" || ext === "jpg" || ext === "png";
}

export function mapArchiveFile(row: {
  id: string;
  name: string;
  ext: string;
  sizeLabel: string;
  modified: string;
  preview: string;
  classificationJson: Prisma.JsonValue;
  resolvedSerial: string | null;
  resolvedCliente: string | null;
}): SourceFile {
  const classification =
    row.classificationJson as unknown as FileClassification;
  return {
    id: row.id,
    name: row.name,
    ext: row.ext as FileExt,
    sizeLabel: row.sizeLabel,
    modified: row.modified,
    preview: row.preview,
    classification,
    correctSerial: row.resolvedSerial ?? undefined,
    correctCliente: row.resolvedCliente ?? undefined,
    uploaded: true,
    publicUrl: canPreviewExt(row.ext)
      ? `/api/archive/files/${row.id}/content`
      : undefined,
  };
}

export function mapSparePart(row: {
  id: string;
  codice: string;
  codiceOEM: string | null;
  descrizione: string;
  categoria: string | null;
  um: string | null;
  prezzoListino: number | null;
  fornitore: string | null;
  codiceFornitore: string | null;
  leadTimeGiorni: number | null;
  macchinaCompatibile: string | null;
  stato: string;
  completezza: number;
  daVerificare: boolean;
  sorgentiJson: Prisma.JsonValue | null;
  succedaneiJson: Prisma.JsonValue | null;
  conflictFieldsJson: Prisma.JsonValue | null;
}): SparePart {
  const part: SparePart = {
    id: row.id,
    codice: row.codice,
    codiceOEM: row.codiceOEM ?? undefined,
    descrizione: row.descrizione,
    categoria: row.categoria ?? undefined,
    um: row.um ?? undefined,
    prezzoListino: row.prezzoListino,
    fornitore: row.fornitore ?? undefined,
    codiceFornitore: row.codiceFornitore ?? undefined,
    leadTimeGiorni: row.leadTimeGiorni,
    macchinaCompatibile: row.macchinaCompatibile ?? undefined,
    stato: (row.stato as SparePartStatus) || "attivo",
    completezza: row.completezza,
    sorgenti: (row.sorgentiJson as unknown as SparePartSource[]) ?? [],
    succedanei: (row.succedaneiJson as unknown as SparePartSuccedaneo[]) ?? [],
    daVerificare: row.daVerificare,
    conflictFields: (row.conflictFieldsJson as unknown as string[]) ?? undefined,
  };
  if (!part.completezza) {
    part.completezza = computeSpareCompleteness(part);
  }
  return part;
}
