import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { SparePart } from "@/lib/sparePartTypes";
import { mapSparePart } from "@/lib/workspace/mappers";

function sparePartWriteData(p: SparePart) {
  return {
    codiceOEM: p.codiceOEM ?? null,
    nome: p.nome ?? null,
    descrizione: p.descrizione,
    categoria: p.categoria ?? null,
    um: p.um ?? null,
    prezzoListino: p.prezzoListino ?? null,
    fornitore: p.fornitore ?? null,
    codiceFornitore: p.codiceFornitore ?? null,
    brand: p.brand ?? null,
    produttore: p.produttore ?? null,
    leadTimeGiorni: p.leadTimeGiorni ?? null,
    macchinaCompatibile: p.macchinaCompatibile ?? null,
    disponibile: p.disponibile ?? null,
    stato: p.stato,
    completezza: p.completezza,
    daVerificare: p.daVerificare,
    immaginiJson: (p.immagini ?? []) as unknown as Prisma.InputJsonValue,
    sorgentiJson: p.sorgenti as unknown as Prisma.InputJsonValue,
    succedaneiJson: p.succedanei as unknown as Prisma.InputJsonValue,
    conflictFieldsJson: (p.conflictFields ??
      []) as unknown as Prisma.InputJsonValue,
  };
}

export async function persistSparePartsForCompany(
  companyId: string,
  parts: SparePart[]
): Promise<SparePart[]> {
  if (parts.length === 0) return [];
  await prisma.$transaction(
    parts.map((p) =>
      prisma.sparePart.upsert({
        where: {
          companyId_codice: { companyId, codice: p.codice },
        },
        create: {
          id: p.id,
          companyId,
          codice: p.codice,
          ...sparePartWriteData(p),
        },
        update: sparePartWriteData(p),
      })
    )
  );
  const saved = await prisma.sparePart.findMany({
    where: { companyId },
    orderBy: { codice: "asc" },
  });
  return saved.map(mapSparePart);
}
