import type { SparePartSuccedaneo } from "@/lib/sparePartTypes";

export type CatalogPartLike = {
  codice: string;
  descrizione: string;
  nome?: string | null;
  codiceOEM?: string | null;
  stato?: string | null;
  prezzoListino?: number | null;
  disponibile?: boolean | null;
  succedanei?: Array<Pick<SparePartSuccedaneo, "code" | "tipo"> & { note?: string }>;
};

export type SubstituteReason = "listed" | "replaces" | "oem" | "similar";

export type SubstituteCandidate = {
  part: CatalogPartLike;
  reason: SubstituteReason;
  tipo?: string;
};

const STOP = new Set([
  "DISCONTINUED",
  "MANUFACTURER",
  "CONTROL",
  "SENSOR",
  "WITH",
  "FROM",
  "THIS",
  "THAT",
  "PART",
  "ITEM",
  "TYPE",
  "MODEL",
  "SPARE",
  "RICAMBIO",
  "PEZZO",
  "SENZA",
  "PREZZO",
  "AND",
  "THE",
  "FOR",
]);

function normCode(code: string) {
  return code.trim().toUpperCase();
}

function isUsable(part: CatalogPartLike, self: string) {
  const stato = (part.stato ?? "").toLowerCase();
  if (normCode(part.codice) === self) return false;
  if (stato === "obsoleto" || stato === "sostituito") return false;
  return Boolean(part.codice?.trim());
}

function distinctiveTokens(part: CatalogPartLike): string[] {
  const text = [part.codice, part.codiceOEM, part.nome, part.descrizione]
    .filter(Boolean)
    .join(" ");
  return text
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((t) => t.length >= 4 && !STOP.has(t));
}

function tokenScore(part: CatalogPartLike, tokens: string[]) {
  if (tokens.length === 0) return 0;
  const hay = new Set(distinctiveTokens(part));
  let n = 0;
  for (const t of tokens) {
    if (hay.has(t)) n += t.length >= 8 ? 2 : 1;
  }
  return n;
}

/** Trova sostituti in anagrafica per un ricambio obsoleto. */
export function findSparePartSubstitutes(
  current: CatalogPartLike,
  all: CatalogPartLike[],
  limit = 6
): SubstituteCandidate[] {
  const self = normCode(current.codice);
  if (!self) return [];
  const byCode = new Map(all.map((p) => [normCode(p.codice), p]));
  const seen = new Set<string>([self]);
  const out: SubstituteCandidate[] = [];

  const push = (
    part: CatalogPartLike | undefined,
    reason: SubstituteReason,
    tipo?: string
  ) => {
    if (!part || !isUsable(part, self)) return;
    const key = normCode(part.codice);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ part, reason, tipo });
  };

  for (const s of current.succedanei ?? []) {
    if (s.tipo === "sostituisce") continue;
    push(byCode.get(normCode(s.code)), "listed", s.tipo);
  }

  for (const other of all) {
    for (const s of other.succedanei ?? []) {
      if (normCode(s.code) !== self) continue;
      if (s.tipo === "sostituito_da") continue;
      push(other, "replaces", s.tipo);
    }
  }

  const oem = current.codiceOEM?.trim().toUpperCase();
  if (oem) {
    for (const other of all) {
      if ((other.codiceOEM ?? "").trim().toUpperCase() === oem) {
        push(other, "oem");
      }
    }
  }

  if (out.length < limit) {
    const tokens = distinctiveTokens(current);
    const ranked = all
      .map((p) => ({ p, score: tokenScore(p, tokens) }))
      .filter((x) => x.score >= 2)
      .sort((a, b) => b.score - a.score);
    for (const x of ranked) {
      if (out.length >= limit) break;
      push(x.p, "similar");
    }
  }

  return out.slice(0, limit);
}
