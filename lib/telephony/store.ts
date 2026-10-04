import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";
import { settingsWithCallbackStage } from "./settings";
import type {
  InsertCallInput,
  InsertCallResult,
  StoredCall,
  TelephonyCompany,
  TelephonyStore,
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
            customerPhone: input.phone,
            createdLabel: input.ticket.createdLabel,
            createdFull: input.ticket.createdFull,
            updatedFull: input.ticket.updatedFull,
          },
        });

        const call = await tx.phoneCall.create({
          data: {
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
            ticketId: input.ticket.id,
          },
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
};
