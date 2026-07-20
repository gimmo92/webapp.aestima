import { prisma } from "@/lib/prisma";
import { seedCompanyWorkspace } from "./seed";
import {
  mapAssignment,
  mapConversation,
  mapKnowledge,
  mapLabel,
  mapPartRequest,
  mapReport,
  mapSupplier,
  mapSupplierRequest,
  mapTechnician,
  mapTicket,
} from "./mappers";
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
};

export async function loadCompanyWorkspace(
  companyId: string
): Promise<WorkspaceSnapshot> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    throw new Error("Company non trovata");
  }

  if (!company.seededAt) {
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
  };
}
