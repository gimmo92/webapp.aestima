import { prisma } from "@/lib/prisma";
import type { ManualSource } from "@/lib/manualText";

/** Metadati dei manuali, senza il file binario. */
export async function listCompanyManuals(companyId: string) {
  const rows = await prisma.companyManual.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      mimeType: true,
      sizeLabel: true,
      textExtracted: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    mimeType: row.mimeType,
    sizeLabel: row.sizeLabel,
    textExtracted: row.textExtracted,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** Testo dei manuali da inserire nel prompt della chat. */
export async function loadCompanyManuals(
  companyId: string
): Promise<ManualSource[]> {
  const rows = await prisma.companyManual.findMany({
    where: { companyId },
    select: {
      name: true,
      extractedText: true,
      textExtracted: true,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows;
}
