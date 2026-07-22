import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";

type MutateBody = {
  action: string;
  payload: Record<string, unknown>;
};

function asString(v: unknown) {
  return typeof v === "string" ? v : "";
}

function asBool(v: unknown) {
  return Boolean(v);
}

/** Applica una mutazione workspace scoped alla company. */
export async function applyWorkspaceMutation(
  companyId: string,
  body: MutateBody
) {
  const { action, payload } = body;
  const p = (payload ?? {}) as Record<string, unknown>;

  switch (action) {
    case "changeStatus": {
      await prisma.partRequest.updateMany({
        where: { id: asString(p.id), companyId },
        data: { status: asString(p.status) },
      });
      return { ok: true };
    }
    case "toggleLabel": {
      const requestId = asString(p.id);
      const labelId = asString(p.labelId);
      const req = await prisma.partRequest.findFirst({
        where: { id: requestId, companyId },
        include: { labels: true },
      });
      if (!req) return { ok: false, error: "Richiesta non trovata" };
      const has = req.labels.some((l) => l.labelId === labelId);
      if (has) {
        await prisma.partRequestLabel.delete({
          where: {
            partRequestId_labelId: { partRequestId: requestId, labelId },
          },
        });
      } else {
        const label = await prisma.label.findFirst({
          where: { id: labelId, companyId },
        });
        if (!label) return { ok: false, error: "Etichetta non trovata" };
        await prisma.partRequestLabel.create({
          data: { partRequestId: requestId, labelId },
        });
      }
      return { ok: true };
    }
    case "createLabel": {
      const id = asString(p.id);
      await prisma.label.create({
        data: {
          id,
          companyId,
          name: asString(p.name),
          color: asString(p.color),
        },
      });
      return { ok: true, id };
    }
    case "createConversation": {
      const id = asString(p.id);
      const messages = (p.messages as Array<Record<string, unknown>>) ?? [];
      await prisma.conversation.create({
        data: {
          id,
          companyId,
          customerName: asString(p.customerName),
          customerEmail: p.customerEmail ? asString(p.customerEmail) : null,
          status: asString(p.status) || "aperto",
          assignee: asString(p.assignee) || "ai",
          assignedOperatorId: p.assignedOperatorId
            ? asString(p.assignedOperatorId)
            : null,
          channel: asString(p.channel),
          lastMessagePreview: asString(p.lastMessagePreview),
          lastMessageLabel: asString(p.lastMessageLabel),
          machineModel: p.machineModel ? asString(p.machineModel) : null,
          machineSerial: p.machineSerial ? asString(p.machineSerial) : null,
          ticketId: p.ticketId ? asString(p.ticketId) : null,
          visitorOnline: asBool(p.visitorOnline),
          createdFull: asString(p.createdFull),
          updatedFull: asString(p.updatedFull),
          messages: {
            create: messages.map((m) => ({
              id: asString(m.id),
              companyId,
              role: asString(m.role),
              content: asString(m.content),
              timestampLabel: asString(m.timestampLabel),
              sparePartsJson: (m.spareParts as Prisma.InputJsonValue) ?? undefined,
              ticketJson: (m.ticket as Prisma.InputJsonValue) ?? undefined,
            })),
          },
        },
      });
      return { ok: true, id };
    }
    case "updateConversation": {
      const id = asString(p.id);
      const data: Prisma.ConversationUpdateManyMutationInput = {};
      if (p.status !== undefined) data.status = asString(p.status);
      if (p.assignee !== undefined) data.assignee = asString(p.assignee);
      if (p.assignedOperatorId !== undefined) {
        data.assignedOperatorId = p.assignedOperatorId
          ? asString(p.assignedOperatorId)
          : null;
      }
      if (p.customerName !== undefined) data.customerName = asString(p.customerName);
      if (p.machineModel !== undefined) {
        data.machineModel = p.machineModel ? asString(p.machineModel) : null;
      }
      if (p.machineSerial !== undefined) {
        data.machineSerial = p.machineSerial ? asString(p.machineSerial) : null;
      }
      if (p.ticketId !== undefined) {
        data.ticketId = p.ticketId ? asString(p.ticketId) : null;
      }
      if (p.visitorOnline !== undefined) data.visitorOnline = asBool(p.visitorOnline);
      if (p.lastMessageLabel !== undefined)
        data.lastMessageLabel = asString(p.lastMessageLabel);
      if (p.updatedFull !== undefined) data.updatedFull = asString(p.updatedFull);
      await prisma.conversation.updateMany({
        where: { id, companyId },
        data,
      });
      return { ok: true };
    }
    case "appendConversationMessage": {
      const conversationId = asString(p.id);
      const message = p.message as Record<string, unknown>;
      const conv = await prisma.conversation.findFirst({
        where: { id: conversationId, companyId },
      });
      if (!conv) return { ok: false, error: "Conversazione non trovata" };
      await prisma.$transaction([
        prisma.conversationMessage.create({
          data: {
            id: asString(message.id),
            conversationId,
            companyId,
            role: asString(message.role),
            content: asString(message.content),
            timestampLabel: asString(message.timestampLabel),
            sparePartsJson:
              (message.spareParts as Prisma.InputJsonValue) ?? undefined,
            ticketJson: (message.ticket as Prisma.InputJsonValue) ?? undefined,
          },
        }),
        prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessagePreview: asString(message.content).slice(0, 80),
            lastMessageLabel: asString(message.timestampLabel),
            updatedFull: asString(p.updatedFull),
          },
        }),
      ]);
      return { ok: true };
    }
    case "takeOverConversation": {
      const id = asString(p.id);
      const operatorId = asString(p.operatorId);
      const notice = p.notice as Record<string, unknown>;
      const conv = await prisma.conversation.findFirst({
        where: { id, companyId },
      });
      if (!conv) return { ok: false, error: "Conversazione non trovata" };
      if (conv.assignee === "operatore") return { ok: true };
      await prisma.$transaction([
        prisma.conversation.update({
          where: { id },
          data: {
            assignee: "operatore",
            assignedOperatorId: operatorId,
            lastMessagePreview: asString(notice.content).slice(0, 80),
            lastMessageLabel: asString(notice.timestampLabel),
            updatedFull: asString(p.updatedFull),
          },
        }),
        prisma.conversationMessage.create({
          data: {
            id: asString(notice.id),
            conversationId: id,
            companyId,
            role: "agent",
            content: asString(notice.content),
            timestampLabel: asString(notice.timestampLabel),
          },
        }),
      ]);
      return { ok: true };
    }
    case "createTicket": {
      const id = asString(p.id);
      await prisma.serviceTicket.create({
        data: {
          id,
          companyId,
          status: asString(p.status) || "aperto",
          priority: asString(p.priority) || "normale",
          source: asString(p.source),
          category: asString(p.category) || "altro",
          summary: asString(p.summary),
          description: asString(p.description),
          machineModel: p.machineModel ? asString(p.machineModel) : null,
          machineSerial: p.machineSerial ? asString(p.machineSerial) : null,
          createdLabel: asString(p.createdLabel),
          createdFull: asString(p.createdFull),
          updatedFull: asString(p.updatedFull),
        },
      });
      return { ok: true, id };
    }
    case "updateTicket": {
      const id = asString(p.id);
      const data: Prisma.ServiceTicketUpdateManyMutationInput = {};
      if (p.status !== undefined) data.status = asString(p.status);
      if (p.priority !== undefined) data.priority = asString(p.priority);
      if (p.internalNotes !== undefined)
        data.internalNotes = asString(p.internalNotes);
      if (p.description !== undefined) data.description = asString(p.description);
      if (p.solution !== undefined) data.solution = asString(p.solution);
      if (p.knowledgeEntryId !== undefined)
        data.knowledgeEntryId = asString(p.knowledgeEntryId);
      if (p.assignedTechnicianId !== undefined) {
        data.assignedTechnicianId = p.assignedTechnicianId
          ? asString(p.assignedTechnicianId)
          : null;
      }
      if (p.updatedFull !== undefined) data.updatedFull = asString(p.updatedFull);
      await prisma.serviceTicket.updateMany({
        where: { id, companyId },
        data,
      });
      return { ok: true };
    }
    case "addSupplier": {
      await prisma.supplier.create({
        data: {
          id: asString(p.id),
          companyId,
          name: asString(p.name),
          email: asString(p.email),
          contact: p.contact ? asString(p.contact) : null,
          categories: (p.categories as string[]) ?? [],
          notes: p.notes ? asString(p.notes) : null,
        },
      });
      return { ok: true };
    }
    case "addTechnician": {
      await prisma.technician.create({
        data: {
          id: asString(p.id),
          companyId,
          name: asString(p.name),
          email: asString(p.email),
          phone: asString(p.phone),
          capabilities: (p.capabilities as string[]) ?? [],
          region: p.region ? asString(p.region) : null,
          notes: p.notes ? asString(p.notes) : null,
        },
      });
      return { ok: true };
    }
    case "createSupplierRequests": {
      const rows = (p.rows as Array<Record<string, unknown>>) ?? [];
      const partRequestId = asString(p.partRequestId);
      await prisma.$transaction([
        ...rows.map((row) =>
          prisma.supplierRequest.create({
            data: {
              id: asString(row.id),
              companyId,
              partRequestId,
              supplierId: asString(row.supplierId),
              status: asString(row.status),
              subject: asString(row.subject),
              body: asString(row.body),
              componentCode: asString(row.componentCode),
              componentDescription: asString(row.componentDescription),
              machineModel: asString(row.machineModel),
              machineSerial: asString(row.machineSerial),
              sentLabel: asString(row.sentLabel),
              sentFull: asString(row.sentFull),
            },
          })
        ),
        prisma.partRequest.updateMany({
          where: { id: partRequestId, companyId },
          data: { status: "attesa_fornitore" },
        }),
      ]);
      return { ok: true };
    }
    case "updateSupplierRequestStatus": {
      await prisma.supplierRequest.updateMany({
        where: { id: asString(p.id), companyId },
        data: { status: asString(p.status) },
      });
      return { ok: true };
    }
    case "createTechnicianAssignment": {
      const partRequestId = asString(p.partRequestId);
      await prisma.$transaction([
        prisma.technicianAssignment.deleteMany({
          where: { companyId, partRequestId },
        }),
        prisma.technicianAssignment.create({
          data: {
            id: asString(p.id),
            companyId,
            partRequestId,
            technicianId: asString(p.technicianId),
            status: asString(p.status),
            subject: asString(p.subject),
            body: asString(p.body),
            machineModel: p.machineModel ? asString(p.machineModel) : null,
            machineSerial: p.machineSerial ? asString(p.machineSerial) : null,
            componentCode: p.componentCode ? asString(p.componentCode) : null,
            componentDescription: p.componentDescription
              ? asString(p.componentDescription)
              : null,
            assignedLabel: asString(p.assignedLabel),
            assignedFull: asString(p.assignedFull),
          },
        }),
      ]);
      return { ok: true };
    }
    case "updateTechnicianAssignmentStatus": {
      await prisma.technicianAssignment.updateMany({
        where: { id: asString(p.id), companyId },
        data: { status: asString(p.status) },
      });
      return { ok: true };
    }
    case "upsertKnowledgeEntry": {
      const id = asString(p.id);
      await prisma.knowledgeEntry.upsert({
        where: { id },
        create: {
          id,
          companyId,
          machineModel: asString(p.machineModel),
          machineSerial: p.machineSerial ? asString(p.machineSerial) : null,
          problemCategory: asString(p.problemCategory),
          symptom: asString(p.symptom),
          probableCause: asString(p.probableCause),
          solution: asString(p.solution),
          sparePartsJson: (p.spareParts as Prisma.InputJsonValue) ?? [],
          frequency: Number(p.frequency ?? 1),
          sourceTicketId: p.sourceTicketId ? asString(p.sourceTicketId) : null,
          consolidated: asBool(p.consolidated),
          mergedFromIds: (p.mergedFromIds as string[]) ?? [],
          tags: (p.tags as string[]) ?? [],
          createdLabel: asString(p.createdLabel),
          createdFull: asString(p.createdFull),
          updatedFull: asString(p.updatedFull),
        },
        update: {
          frequency: Number(p.frequency ?? 1),
          solution: asString(p.solution),
          probableCause: asString(p.probableCause),
          updatedFull: asString(p.updatedFull),
          consolidated: asBool(p.consolidated),
          mergedFromIds: (p.mergedFromIds as string[]) ?? [],
          tags: (p.tags as string[]) ?? [],
          sparePartsJson: (p.spareParts as Prisma.InputJsonValue) ?? [],
        },
      });
      return { ok: true, id };
    }
    case "incrementKnowledgeFrequency": {
      const id = asString(p.id);
      const row = await prisma.knowledgeEntry.findFirst({
        where: { id, companyId },
      });
      if (!row) return { ok: false };
      await prisma.knowledgeEntry.update({
        where: { id },
        data: {
          frequency: row.frequency + 1,
          updatedFull: asString(p.updatedFull),
        },
      });
      return { ok: true };
    }
    case "removeKnowledgeEntries": {
      const ids = (p.ids as string[]) ?? [];
      await prisma.knowledgeEntry.deleteMany({
        where: { companyId, id: { in: ids } },
      });
      return { ok: true };
    }
    case "consolidateKnowledge": {
      const id = asString(p.id);
      const entryIds = (p.entryIds as string[]) ?? [];
      const merged = p.merged as Record<string, unknown>;
      await prisma.$transaction([
        prisma.knowledgeEntry.deleteMany({
          where: { companyId, id: { in: entryIds } },
        }),
        prisma.knowledgeEntry.create({
          data: {
            id,
            companyId,
            machineModel: asString(merged.machineModel),
            machineSerial: merged.machineSerial
              ? asString(merged.machineSerial)
              : null,
            problemCategory: asString(merged.problemCategory),
            symptom: asString(merged.symptom),
            probableCause: asString(merged.probableCause),
            solution: asString(merged.solution),
            sparePartsJson: (merged.spareParts as Prisma.InputJsonValue) ?? [],
            frequency: Number(merged.frequency ?? 1),
            consolidated: true,
            mergedFromIds: entryIds,
            tags: (merged.tags as string[]) ?? [],
            createdLabel: asString(p.createdLabel),
            createdFull: asString(p.createdFull),
            updatedFull: asString(p.updatedFull),
          },
        }),
      ]);
      return { ok: true, id };
    }
    case "updateArchiveFile": {
      const id = asString(p.id);
      const data: Prisma.ArchiveFileUpdateManyMutationInput = {};
      if (p.classification !== undefined) {
        data.classificationJson = p.classification as Prisma.InputJsonValue;
      }
      if (p.resolvedSerial !== undefined) {
        data.resolvedSerial =
          p.resolvedSerial === null || p.resolvedSerial === ""
            ? null
            : asString(p.resolvedSerial);
      }
      const result = await prisma.archiveFile.updateMany({
        where: { id, companyId },
        data,
      });
      if (result.count === 0) {
        return { ok: false, error: "File archivio non trovato" };
      }
      return { ok: true };
    }
    case "deleteArchiveFile": {
      const id = asString(p.id);
      await prisma.archiveFile.deleteMany({
        where: { id, companyId },
      });
      return { ok: true };
    }
    default:
      return { ok: false, error: `Azione sconosciuta: ${action}` };
  }
}
