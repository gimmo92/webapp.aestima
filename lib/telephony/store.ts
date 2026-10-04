import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  matchCustomer,
  openTicketsForCaller,
} from "./phone";
import { settingsWithCallbackStage } from "./settings";
import type { CallProposal } from "./classify";
import { autoAppliedChoice } from "./classify";
import type {
  CallerContext,
  InsertCallInput,
  InsertCallResult,
  StoredCall,
  TelephonyCompany,
  TelephonyStore,
  UnlinkedCallInput,
} from "./types";

function isUniqueViolation(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002"
  );
}

async function readCall(
  companyId: string,
  externalId: string
): Promise<StoredCall | null> {
  const row = await prisma.phoneCall.findUnique({
    where: { companyId_externalId: { companyId, externalId } },
    select: {
      id: true,
      externalId: true,
      ticketId: true,
      ticket: { select: { status: true } },
    },
  });
  if (!row) return null;
  return {
    id: row.id,
    externalId: row.externalId,
    ticketId: row.ticketId,
    ticketStatus: row.ticket?.status ?? null,
  };
}

function callData(input: UnlinkedCallInput, ticketId: string | null) {
  return {
    companyId: input.companyId,
    externalId: input.externalId,
    direction: input.direction,
    phone: input.phone,
    durationSec: input.durationSec,
    outcome: input.outcome,
    recordingUrl: input.recordingUrl,
    transcript: input.transcript,
    operatorName: input.operatorName,
    occurredAt: input.occurredAt,
    ticketId,
  };
}

async function writeTicket(tx: Prisma.TransactionClient, input: InsertCallInput) {
  if (input.persistCallbackStage) {
    const company = await tx.company.findUnique({
      where: { id: input.companyId },
      select: { settingsJson: true },
    });
    await tx.company.update({
      where: { id: input.companyId },
      data: {
        settingsJson: settingsWithCallbackStage(
          company?.settingsJson
        ) as Prisma.InputJsonValue,
      },
    });
  }
  await tx.serviceTicket.create({
    data: {
      id: input.ticket.id,
      companyId: input.companyId,
      status: input.ticket.status,
      priority: "normale",
      source: "telefono",
      category: "altro",
      summary: input.ticket.summary,
      description: input.ticket.description,
      customerId: input.ticket.customerId ?? null,
      customerName: input.ticket.customerName ?? null,
      customerEmail: input.ticket.customerEmail ?? null,
      customerPhone: input.phone,
      customerCompany: input.ticket.customerCompany ?? null,
      createdLabel: input.ticket.createdLabel,
      createdFull: input.ticket.createdFull,
      updatedFull: input.ticket.updatedFull,
    },
  });
}

export const prismaTelephonyStore: TelephonyStore = {
  async findCompanyBySlug(slug: string): Promise<TelephonyCompany | null> {
    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, slug: true, settingsJson: true },
    });
    return company;
  },

  findCallByExternalId(companyId, externalId) {
    return readCall(companyId, externalId);
  },

  async findCallerContext(companyId, phone, terminalStatuses): Promise<CallerContext> {
    const [customers, tickets] = await Promise.all([
      prisma.customer.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          contactName: true,
          email: true,
          phone: true,
        },
      }),
      prisma.serviceTicket.findMany({
        where: {
          companyId,
          ...(terminalStatuses.length
            ? { status: { notIn: terminalStatuses } }
            : {}),
        },
        select: {
          id: true,
          summary: true,
          status: true,
          customerId: true,
          customerName: true,
          customerCompany: true,
          customerPhone: true,
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
    const customer = matchCustomer(phone, customers);
    const openTickets = openTicketsForCaller(
      tickets,
      phone,
      customer,
      []
    ).map((ticket) => ({
      id: ticket.id,
      summary: ticket.summary,
      status: ticket.status,
    }));
    return {
      customer: customer
        ? {
            id: customer.id,
            name: customer.name,
            contactName: customer.contactName,
            email: customer.email,
            phone: customer.phone,
          }
        : null,
      openTickets,
    };
  },

  async insertUnlinkedCall(input: UnlinkedCallInput): Promise<InsertCallResult> {
    try {
      const call = await prisma.phoneCall.create({
        data: callData(input, null),
        select: { id: true },
      });
      return {
        created: true,
        callId: call.id,
        ticketId: null,
        ticketStatus: null,
      };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const existing = await readCall(input.companyId, input.externalId);
      if (!existing) throw err;
      return {
        created: false,
        callId: existing.id,
        ticketId: existing.ticketId,
        ticketStatus: existing.ticketStatus,
      };
    }
  },

  async attachCallToTicket(companyId, externalId, ticketId) {
    const ticket = await prisma.serviceTicket.findFirst({
      where: { id: ticketId, companyId },
      select: { id: true, status: true, customerPhone: true },
    });
    if (!ticket) return { error: "Ticket non trovato." };
    const call = await prisma.phoneCall.findUnique({
      where: { companyId_externalId: { companyId, externalId } },
      select: { id: true, phone: true, ticketId: true },
    });
    if (!call) return { error: "Chiamata non trovata." };
    if (call.ticketId && call.ticketId !== ticketId) {
      return {
        created: false,
        callId: call.id,
        ticketId: call.ticketId,
        ticketStatus: ticket.status,
      };
    }
    await prisma.phoneCall.update({
      where: { id: call.id },
      data: { ticketId },
    });
    if (!ticket.customerPhone) {
      await prisma.serviceTicket.updateMany({
        where: { id: ticketId, companyId },
        data: { customerPhone: call.phone },
      });
    }
    return {
      created: true,
      callId: call.id,
      ticketId,
      ticketStatus: ticket.status,
    };
  },

  async createTicketForExistingCall(input) {
    const existing = await readCall(input.companyId, input.externalId);
    if (!existing) return { error: "Chiamata non trovata." };
    if (existing.ticketId) {
      return {
        created: false,
        callId: existing.id,
        ticketId: existing.ticketId,
        ticketStatus: existing.ticketStatus,
      };
    }
    try {
      await prisma.$transaction(async (tx) => {
        await writeTicket(tx, input);
        await tx.phoneCall.updateMany({
          where: {
            companyId: input.companyId,
            externalId: input.externalId,
            ticketId: null,
          },
          data: { ticketId: input.ticket.id },
        });
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }
    const after = await readCall(input.companyId, input.externalId);
    if (!after) return { error: "Chiamata non trovata." };
    return {
      created: after.ticketId === input.ticket.id,
      callId: after.id,
      ticketId: after.ticketId,
      ticketStatus: after.ticketId === input.ticket.id ? input.ticket.status : after.ticketStatus,
    };
  },

  async insertTicketAndCall(input: InsertCallInput): Promise<InsertCallResult> {
    try {
      return await prisma.$transaction(async (tx) => {
        const dup = await tx.phoneCall.findUnique({
          where: {
            companyId_externalId: {
              companyId: input.companyId,
              externalId: input.externalId,
            },
          },
          select: {
            id: true,
            ticketId: true,
            ticket: { select: { status: true } },
          },
        });
        if (dup) {
          return {
            created: false,
            callId: dup.id,
            ticketId: dup.ticketId,
            ticketStatus: dup.ticket?.status ?? null,
          };
        }

        if (input.persistCallbackStage) {
          const company = await tx.company.findUnique({
            where: { id: input.companyId },
            select: { settingsJson: true },
          });
          await tx.company.update({
            where: { id: input.companyId },
            data: {
              settingsJson: settingsWithCallbackStage(
                company?.settingsJson
              ) as Prisma.InputJsonValue,
            },
          });
        }

        await writeTicket(tx, { ...input, persistCallbackStage: false });

        const call = await tx.phoneCall.create({
          data: callData(input, input.ticket.id),
          select: { id: true },
        });

        return {
          created: true,
          callId: call.id,
          ticketId: input.ticket.id,
          ticketStatus: input.ticket.status,
        };
      });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const existing = await readCall(input.companyId, input.externalId);
      if (!existing) throw err;
      return {
        created: false,
        callId: existing.id,
        ticketId: existing.ticketId,
        ticketStatus: existing.ticketStatus,
      };
    }
  },

  async saveAiProposal(companyId, ticketId, proposal: CallProposal) {
    await prisma.serviceTicket.updateMany({
      where: { id: ticketId, companyId },
      data: { aiProposalJson: proposal as Prisma.InputJsonValue },
    });
  },

  async applyAutoRoute(companyId, ticketId, currentStatus, proposal, settingsJson) {
    const applied = autoAppliedChoice(proposal, currentStatus, settingsJson);
    if (!applied) return null;
    await prisma.serviceTicket.updateMany({
      where: { id: ticketId, companyId },
      data: {
        status: applied.status,
        priority: applied.choice.urgency,
        category: applied.choice.category,
        summary: applied.choice.summary,
        department: applied.choice.department,
        machineModel: applied.choice.product,
        machineSerial: applied.choice.orderNumber,
        aiProposalJson: proposal as Prisma.InputJsonValue,
        operatorChoiceJson: applied.choice as Prisma.InputJsonValue,
      },
    });
    return applied.status;
  },
};
