import { prisma } from "@/lib/prisma";
import { exampleLeadTimeDays } from "@/lib/exampleLeadTime";

/** Completa in anagrafica i ricambi senza lead time. */
export async function fillMissingLeadTimes(companyId: string): Promise<number> {
  const rows = await prisma.sparePart.findMany({
    where: { companyId, leadTimeGiorni: null },
    select: {
      id: true,
      codice: true,
      categoria: true,
      descrizione: true,
      nome: true,
      disponibile: true,
      stato: true,
    },
  });
  if (rows.length === 0) return 0;

  const chunk = 40;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    await prisma.$transaction(
      slice.map((row) =>
        prisma.sparePart.update({
          where: { id: row.id },
          data: { leadTimeGiorni: exampleLeadTimeDays(row) },
        })
      )
    );
  }
  return rows.length;
}
