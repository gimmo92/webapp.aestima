import { prisma } from "@/lib/prisma";
import type { SparePart, SparePartStatus } from "@/lib/sparePartTypes";

/** Prefisso listini OEM: "DISCONTINUED BY MANUFACTURER, …" */
const DISCONTINUED_PREFIX =
  /^\s*discontinued\s+by(?:\s+manufacturer)?\s*[,;:\-–—]?\s*/i;

export function stripDiscontinuedPrefix(text: string | null | undefined): {
  text: string;
  discontinued: boolean;
} {
  const original = (text ?? "").trim();
  if (!original) return { text: "", discontinued: false };
  if (!DISCONTINUED_PREFIX.test(original)) {
    return { text: original, discontinued: false };
  }
  const stripped = original
    .replace(DISCONTINUED_PREFIX, "")
    .trim()
    .replace(/^[,;:\-–—]\s*/, "");
  return {
    text: stripped,
    discontinued: true,
  };
}

function nextStato(
  current: string | null | undefined,
  discontinued: boolean
): SparePartStatus | undefined {
  if (!discontinued) {
    return current ? (current as SparePartStatus) : undefined;
  }
  if (current === "sostituito") return "sostituito";
  return "obsoleto";
}

/** Toglie il prefisso DISCONTINUED BY e marca il ricambio obsoleto. */
export function applyDiscontinuedPrefix<
  T extends {
    codice?: string;
    nome?: string | null;
    descrizione?: string | null;
    stato?: string | null;
  },
>(part: T): T {
  const nomeR = stripDiscontinuedPrefix(part.nome);
  const descR = stripDiscontinuedPrefix(part.descrizione);
  const hit = nomeR.discontinued || descR.discontinued;
  if (!hit) return part;

  const nome = nomeR.text || undefined;
  const descrizione =
    descR.text || nome || part.codice || (part.descrizione ?? "");
  const stato = nextStato(part.stato, hit);

  return {
    ...part,
    nome: nome ?? null,
    descrizione,
    ...(stato ? { stato } : {}),
  };
}

export function applyDiscontinuedToSparePart(part: SparePart): SparePart {
  const next = applyDiscontinuedPrefix(part);
  return {
    ...part,
    nome: next.nome || undefined,
    descrizione: next.descrizione || part.codice,
    stato: (next.stato as SparePartStatus) || part.stato,
  };
}

/** Riscrive in DB i ricambi che hanno ancora il prefisso nel testo. */
export async function cleanupDiscontinuedSpareParts(
  companyId: string
): Promise<number> {
  const rows = await prisma.sparePart.findMany({
    where: {
      companyId,
      OR: [
        {
          descrizione: { contains: "DISCONTINUED BY", mode: "insensitive" },
        },
        { nome: { contains: "DISCONTINUED BY", mode: "insensitive" } },
      ],
    },
  });

  let updated = 0;
  for (const row of rows) {
    const next = applyDiscontinuedPrefix({
      codice: row.codice,
      nome: row.nome,
      descrizione: row.descrizione,
      stato: row.stato,
    });
    const nome = next.nome || null;
    const descrizione = next.descrizione || row.codice;
    const stato = next.stato || row.stato;
    if (
      nome === row.nome &&
      descrizione === row.descrizione &&
      stato === row.stato
    ) {
      continue;
    }
    await prisma.sparePart.update({
      where: { id: row.id },
      data: { nome, descrizione, stato },
    });
    updated += 1;
  }
  return updated;
}
