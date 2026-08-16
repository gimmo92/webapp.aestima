import { prisma } from "@/lib/prisma";
import { DEMO_COMPANY_SLUG, seedCompanyWorkspace } from "./seed";
import {
  mapArchiveFile,
  mapAssignment,
  mapConversation,
  mapKnowledge,
  mapLabel,
  mapPartRequest,
  mapReport,
  mapSparePart,
  mapCustomer,
  mapSupplier,
  mapSupplierRequest,
  mapTechnician,
  mapTicket,
} from "./mappers";
import type { Label, PartRequest } from "@/lib/inboxTypes";
import type { ConversationRecord } from "@/lib/conversationTypes";
import type { KnowledgeEntry } from "@/lib/knowledgeTypes";
import type { ServiceTicketRecord, TicketStage } from "@/lib/ticketTypes";
import { normalizeTicketStages } from "@/lib/ticketData";
import type { Supplier, SupplierRequest } from "@/lib/supplierTypes";
import type { Customer } from "@/lib/customerTypes";
import type { CompanyUserOption } from "@/lib/companyUsers";
import type {
  InterventionReport,
  Technician,
  TechnicianAssignment,
} from "@/lib/technicianTypes";
import type { SourceFile } from "@/lib/archiveTypes";
import type { SparePart } from "@/lib/sparePartTypes";

export type WorkspaceSnapshot = {
  labels: Label[];
  requests: PartRequest[];
  conversations: ConversationRecord[];
  knowledgeBase: KnowledgeEntry[];
  tickets: ServiceTicketRecord[];
  suppliers: Supplier[];
  supplierRequests: SupplierRequest[];
  technicians: Technician[];
  technicianAssignments: TechnicianAssignment[];
  interventionReports: InterventionReport[];
  archiveFiles: SourceFile[];
  spareParts: SparePart[];
  ticketStages: TicketStage[];
  customers: Customer[];
  companyUsers: CompanyUserOption[];
};

export async function loadCompanyWorkspace(
  companyId: string
): Promise<WorkspaceSnapshot> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      slug: true,
      seededAt: true,
      settingsJson: true,
    },
  });
  if (!company) {
    throw new Error("Company non trovata");
  }

  // Solo Spark riceve i dati demo; le altre company restano vuote.
  if (company.slug === DEMO_COMPANY_SLUG && !company.seededAt) {
    await seedCompanyWorkspace(companyId);
  }

  const [
    labels,
    requests,
    conversations,
    knowledgeBase,
    tickets,
    suppliers,
    supplierRequests,
    technicians,
    technicianAssignments,
    interventionReports,
    archiveFiles,
    spareParts,
    customers,
    companyUsers,
  ] = await Promise.all([
    prisma.label.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.partRequest.findMany({
      where: { companyId },
      include: { labels: { select: { labelId: true } } },
      orderBy: { receivedAt: "desc" },
    }),
    prisma.conversation.findMany({
      where: { companyId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.knowledgeEntry.findMany({
      where: { companyId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.serviceTicket.findMany({
      where: { companyId },
      include: {
        attachments: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            sizeLabel: true,
            kind: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.supplier.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.supplierRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.technician.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.technicianAssignment.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.interventionReport.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.archiveFile.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        ext: true,
        sizeLabel: true,
        modified: true,
        preview: true,
        classificationJson: true,
        resolvedSerial: true,
        resolvedCliente: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sparePart.findMany({
      where: { companyId },
      orderBy: { codice: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  return {
    labels: labels.map(mapLabel),
    requests: requests.map(mapPartRequest),
    conversations: conversations.map(mapConversation),
    knowledgeBase: knowledgeBase.map(mapKnowledge),
    tickets: tickets.map(mapTicket),
    suppliers: suppliers.map(mapSupplier),
    supplierRequests: supplierRequests.map(mapSupplierRequest),
    technicians: technicians.map(mapTechnician),
    technicianAssignments: technicianAssignments.map(mapAssignment),
    interventionReports: interventionReports.map(mapReport),
    archiveFiles: archiveFiles.map(mapArchiveFile),
    spareParts: spareParts.map(mapSparePart),
    ticketStages: normalizeTicketStages(
      (company.settingsJson as { ticketStages?: unknown } | null)?.ticketStages
    ),
    customers: customers.map(mapCustomer),
    companyUsers,
  };
}
