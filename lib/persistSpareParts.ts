import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { SparePart } from "@/lib/sparePartTypes";
import { mapSparePart } from "@/lib/workspace/mappers";

const UPSERT_CHUNK = 25;

function finiteOrNull(n: number | null | undefined): number | null {
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function intOrNull(n: number | null | undefined): number | null {
  const v = finiteOrNull(n);
  return v == null ? null : Math.round(v);
}

function sparePartWriteData(p: SparePart) {
  return {
    codiceOEM: p.codiceOEM?.trim() || null,
    nome: p.nome?.trim() || null,
    descrizione: p.descrizione?.trim() || p.nome?.trim() || p.codice,
    categoria: p.categoria?.trim() || null,
    um: p.um?.trim() || null,
    prezzoListino: finiteOrNull(p.prezzoListino),
    fornitore: p.fornitore?.trim() || null,
    codiceFornitore: p.codiceFornitore?.trim() || null,
    brand: p.brand?.trim() || null,
    produttore: p.produttore?.trim() || null,
    leadTimeGiorni: intOrNull(p.leadTimeGiorni),
    macchinaCompatibile: p.macchinaCompatibile?.trim() || null,
    disponibile: p.disponibile ?? null,
    stato: p.stato || "attivo",
    completezza: Math.max(0, Math.min(100, Math.round(p.completezza || 0))),
    daVerificare: Boolean(p.daVerificare),
    immaginiJson: (p.immagini ?? []) as unknown as Prisma.InputJsonValue,
    sorgentiJson: (p.sorgenti ?? []) as unknown as Prisma.InputJsonValue,
    succedaneiJson: (p.succedanei ?? []) as unknown as Prisma.InputJsonValue,
    conflictFieldsJson: (p.conflictFields ??
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
      await prisma.sparePart.upsert({
        where: {
          companyId_codice: { companyId, codice: p.codice },
        },
        create: {
          id: p.id,
          companyId,
          codice: p.codice,
          ...data,
        },
        update: data,
      });
    }
  }
  const saved = await prisma.sparePart.findMany({
    where: { companyId },
    orderBy: { codice: "asc" },
  });
  return saved.map(mapSparePart);
}
