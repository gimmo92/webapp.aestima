import { prisma } from "@/lib/prisma";

/** Cancella tutti i dati operativi di una company (non tocca utenti). */
export async function clearCompanyWorkspace(companyId: string) {
  await prisma.$transaction([
    prisma.conversationMessage.deleteMany({ where: { companyId } }),
    prisma.conversation.deleteMany({ where: { companyId } }),
    prisma.supplierRequest.deleteMany({ where: { companyId } }),
    prisma.technicianAssignment.deleteMany({ where: { companyId } }),
    prisma.interventionReport.deleteMany({ where: { companyId } }),
    prisma.partRequestLabel.deleteMany({
      where: { partRequest: { companyId } },
    }),
    prisma.partRequest.deleteMany({ where: { companyId } }),
    prisma.label.deleteMany({ where: { companyId } }),
    prisma.knowledgeEntry.deleteMany({ where: { companyId } }),
    prisma.serviceTicket.deleteMany({ where: { companyId } }),
    prisma.supplier.deleteMany({ where: { companyId } }),
    prisma.technician.deleteMany({ where: { companyId } }),
    prisma.company.update({
      where: { id: companyId },
      data: { seededAt: null },
    }),
  ]);
}

/** Cancella i dati operativi di tutte le company. */
export async function clearAllCompanyWorkspaces() {
  const companies = await prisma.company.findMany({ select: { id: true } });
  for (const c of companies) {
    await clearCompanyWorkspace(c.id);
  }
  return companies.length;
}
