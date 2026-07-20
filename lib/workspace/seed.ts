import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { DEFAULT_LABELS, MOCK_REQUESTS } from "@/lib/inboxData";
import { MOCK_CONVERSATIONS } from "@/lib/conversationData";
import { MOCK_KNOWLEDGE_ENTRIES } from "@/lib/knowledgeData";
import { MOCK_TICKETS } from "@/lib/ticketData";
import { MOCK_SUPPLIERS, MOCK_SUPPLIER_REQUESTS } from "@/lib/supplierData";
import {
  MOCK_TECHNICIANS,
  MOCK_TECHNICIAN_ASSIGNMENTS,
  MOCK_INTERVENTION_REPORTS,
} from "@/lib/technicianData";

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

function nid(companyId: string, kind: string, oldId: string) {
  return `${kind}_${companyId.slice(-10)}_${oldId}`;
}

/** Popola una company nuova con i dati demo mock, isolati per tenant. */
export async function seedCompanyWorkspace(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company || company.seededAt) return;

  const labelMap = new Map<string, string>();
  for (const l of DEFAULT_LABELS) {
    const id = nid(companyId, "lbl", l.id);
    labelMap.set(l.id, id);
    await prisma.label.create({
      data: { id, companyId, name: l.name, color: l.color },
    });
  }

  const requestMap = new Map<string, string>();
  for (const r of MOCK_REQUESTS) {
    const id = nid(companyId, "req", r.id);
    requestMap.set(r.id, id);
    await prisma.partRequest.create({
      data: {
        id,
        companyId,
        fromName: r.from,
        fromEmail: r.fromEmail,
        customerCompany: r.company,
        subject: r.subject,
        body: r.body,
        status: r.status,
        primary: r.primary,
        receivedLabel: r.receivedLabel,
        receivedFull: r.receivedFull,
        attachmentsJson: asJson(r.attachments),
        labels: {
          create: r.labelIds
            .map((old) => labelMap.get(old))
            .filter((x): x is string => Boolean(x))
            .map((labelId) => ({ labelId })),
        },
      },
    });
  }

  const supplierMap = new Map<string, string>();
  for (const s of MOCK_SUPPLIERS) {
    const id = nid(companyId, "sup", s.id);
    supplierMap.set(s.id, id);
    await prisma.supplier.create({
      data: {
        id,
        companyId,
        name: s.name,
        email: s.email,
        contact: s.contact,
        categories: s.categories,
        notes: s.notes,
      },
    });
  }

  for (const sr of MOCK_SUPPLIER_REQUESTS) {
    const partRequestId = requestMap.get(sr.partRequestId);
    const supplierId = supplierMap.get(sr.supplierId);
    if (!partRequestId || !supplierId) continue;
    await prisma.supplierRequest.create({
      data: {
        id: nid(companyId, "sr", sr.id),
        companyId,
        partRequestId,
        supplierId,
        status: sr.status,
        subject: sr.subject,
        body: sr.body,
        componentCode: sr.componentCode,
        componentDescription: sr.componentDescription,
        machineModel: sr.machineModel,
        machineSerial: sr.machineSerial,
        sentLabel: sr.sentLabel,
        sentFull: sr.sentFull,
      },
    });
  }

  const techMap = new Map<string, string>();
  for (const t of MOCK_TECHNICIANS) {
    const id = nid(companyId, "tech", t.id);
    techMap.set(t.id, id);
    await prisma.technician.create({
      data: {
        id,
        companyId,
        name: t.name,
        email: t.email,
        phone: t.phone,
        capabilities: t.capabilities,
        region: t.region,
        notes: t.notes,
      },
    });
  }

  for (const a of MOCK_TECHNICIAN_ASSIGNMENTS) {
    const partRequestId = requestMap.get(a.partRequestId);
    const technicianId = techMap.get(a.technicianId);
    if (!partRequestId || !technicianId) continue;
    await prisma.technicianAssignment.create({
      data: {
        id: nid(companyId, "ta", a.id),
        companyId,
        partRequestId,
        technicianId,
        status: a.status,
        subject: a.subject,
        body: a.body,
        machineModel: a.machineModel,
        machineSerial: a.machineSerial,
        componentCode: a.componentCode,
        componentDescription: a.componentDescription,
        assignedLabel: a.assignedLabel,
        assignedFull: a.assignedFull,
      },
    });
  }

  for (const ir of MOCK_INTERVENTION_REPORTS) {
    const technicianId = techMap.get(ir.technicianId);
    if (!technicianId) continue;
    await prisma.interventionReport.create({
      data: {
        id: nid(companyId, "ir", ir.id),
        companyId,
        reportNumber: ir.reportNumber,
        machineSerial: ir.machineSerial,
        machineModel: ir.machineModel,
        technicianId,
        interventionDate: ir.interventionDate,
        interventionDateFull: ir.interventionDateFull,
        type: ir.type,
        outcome: ir.outcome,
        hours: ir.hours,
        summary: ir.summary,
        workPerformed: ir.workPerformed,
        partsUsedJson: asJson(ir.partsUsed),
        customerCompany: ir.customerCompany,
        assignmentId: ir.assignmentId
          ? nid(companyId, "ta", ir.assignmentId)
          : undefined,
      },
    });
  }

  for (const t of MOCK_TICKETS) {
    await prisma.serviceTicket.create({
      data: {
        id: nid(companyId, "tkt", t.id),
        companyId,
        status: t.status,
        priority: t.priority,
        source: t.source,
        category: t.category,
        summary: t.summary,
        description: t.description,
        machineModel: t.machineModel,
        machineSerial: t.machineSerial,
        assignedTechnicianId: t.assignedTechnicianId
          ? techMap.get(t.assignedTechnicianId)
          : undefined,
        internalNotes: t.internalNotes,
        solution: t.solution,
        knowledgeEntryId: t.knowledgeEntryId
          ? nid(companyId, "kb", t.knowledgeEntryId)
          : undefined,
        createdLabel: t.createdLabel,
        createdFull: t.createdFull,
        updatedFull: t.updatedFull,
      },
    });
  }

  for (const k of MOCK_KNOWLEDGE_ENTRIES) {
    await prisma.knowledgeEntry.create({
      data: {
        id: nid(companyId, "kb", k.id),
        companyId,
        machineModel: k.machineModel,
        machineSerial: k.machineSerial,
        problemCategory: k.problemCategory,
        symptom: k.symptom,
        probableCause: k.probableCause,
        solution: k.solution,
        sparePartsJson: asJson(k.spareParts) ?? [],
        frequency: k.frequency,
        sourceTicketId: k.sourceTicketId
          ? nid(companyId, "tkt", k.sourceTicketId)
          : undefined,
        consolidated: k.consolidated,
        mergedFromIds: (k.mergedFromIds ?? []).map((id) =>
          nid(companyId, "kb", id)
        ),
        tags: k.tags,
        createdLabel: k.createdLabel,
        createdFull: k.createdFull,
        updatedFull: k.updatedFull,
      },
    });
  }

  for (const c of MOCK_CONVERSATIONS) {
    const id = nid(companyId, "conv", c.id);
    await prisma.conversation.create({
      data: {
        id,
        companyId,
        customerName: c.customerName,
        customerEmail: c.customerEmail,
        status: c.status,
        assignee: c.assignee,
        assignedOperatorId: c.assignedOperatorId,
        channel: c.channel,
        lastMessagePreview: c.lastMessagePreview,
        lastMessageLabel: c.lastMessageLabel,
        machineModel: c.machineModel,
        machineSerial: c.machineSerial,
        ticketId: c.ticketId ? nid(companyId, "tkt", c.ticketId) : undefined,
        visitorOnline: c.visitorOnline ?? false,
        createdFull: c.createdFull,
        updatedFull: c.updatedFull,
        messages: {
          create: c.messages.map((m) => ({
            id: nid(companyId, "msg", m.id),
            companyId,
            role: m.role,
            content: m.content,
            timestampLabel: m.timestampLabel,
            sparePartsJson: asJson(m.spareParts),
            ticketJson: asJson(m.ticket),
          })),
        },
      },
    });
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { seededAt: new Date() },
  });
}
