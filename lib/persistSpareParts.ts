import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { SparePart } from "@/lib/sparePartTypes";
import { mapSparePart } from "@/lib/workspace/mappers";
import { applyDiscontinuedToSparePart, cleanupDiscontinuedSpareParts } from "@/lib/discontinuedSparePart";

const UPSERT_CHUNK = 25;

function finiteOrNull(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function intOrNull(n: number | null | undefined): number | null {
  const v = finiteOrNull(n);
  return v == null ? null : Math.round(v);
}

function sparePartWriteData(p: SparePart) {
  const part = applyDiscontinuedToSparePart(p);
  return {
    codiceOEM: part.codiceOEM?.trim() || null,
    nome: part.nome?.trim() || null,
    descrizione: part.descrizione?.trim() || part.nome?.trim() || part.codice,
    categoria: part.categoria?.trim() || null,
    um: part.um?.trim() || null,
    prezzoListino: finiteOrNull(part.prezzoListino),
    fornitore: part.fornitore?.trim() || null,
    codiceFornitore: part.codiceFornitore?.trim() || null,
    brand: part.brand?.trim() || null,
    produttore: part.produttore?.trim() || null,
    leadTimeGiorni: intOrNull(part.leadTimeGiorni),
    macchinaCompatibile: part.macchinaCompatibile?.trim() || null,
    disponibile: part.disponibile ?? null,
    stato: part.stato || "attivo",
    completezza: Math.max(0, Math.min(100, Math.round(part.completezza || 0))),
    daVerificare: Boolean(part.daVerificare),
    immaginiJson: (part.immagini ?? []) as unknown as Prisma.InputJsonValue,
    sorgentiJson: (part.sorgenti ?? []) as unknown as Prisma.InputJsonValue,
    succedaneiJson: (part.succedanei ?? []) as unknown as Prisma.InputJsonValue,
    conflictFieldsJson: (part.conflictFields ??
      []) as unknown as Prisma.InputJsonValue,
  };
}

/** Upsert a lotti (niente mega-transazione: su cataloghi da centinaia di righe andava in 500). */
export async function persistSparePartsForCompany(
  companyId: string,
  parts: SparePart[]
): Promise<SparePart[]> {
  for (let i = 0; i < parts.length; i += UPSERT_CHUNK) {
    const chunk = parts.slice(i, i + UPSERT_CHUNK);
    for (const p of chunk) {
      if (!p.codice?.trim()) continue;
      const data = sparePartWriteData(p);
      try {
        await prisma.sparePart.upsert({
          where: {
            companyId_codice: { companyId, codice: p.codice },
          },
          create: {
            companyId,
            codice: p.codice,
            ...data,
          },
          update: data,
        });
      } catch (err) {
        console.error("spare upsert fail", p.codice, err);
        throw err;
      }
    }
  }
  await cleanupDiscontinuedSpareParts(companyId);
  const saved = await prisma.sparePart.findMany({
    where: { companyId },
    orderBy: { codice: "asc" },
  });
  return saved.map(mapSparePart);
}
