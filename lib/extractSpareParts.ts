import type {
  SparePart,
  SparePartSource,
  SparePartStatus,
} from "./sparePartTypes";
import {
  computeSpareCompleteness,
  newSparePartId,
} from "./sparePartTypes";

/** Normalizza prezzo italiano: "12,50 €" | "1.234,56" | 12.5 → number */
export function parseItalianPrice(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  let s = String(raw).trim();
  if (!s) return null;
  s = s.replace(/\s/g, "").replace(/€|EUR|eur/gi, "");
  // 1.234,56 → 1234.56
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  } else if (s.includes(",") && s.includes(".")) {
    // 1,234.56 US vs 1.234,56 IT — se ultima virgola dopo ultimo punto → IT
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Riga di totale / intestazione ripetuta da scartare. */
export function isJunkRow(cells: string[]): boolean {
  const joined = cells.join(" ").toLowerCase().trim();
  if (!joined) return true;
  if (/^(totale|total|subtotale|somma|riporto)\b/.test(joined)) return true;
  if (/^codice\b/.test(joined) && /descrizione/.test(joined)) return true;
  // Riga tutta uguale a header-like
  const nonEmpty = cells.filter((c) => c.trim());
  if (nonEmpty.length <= 1 && /^(nr|n\.|qty|q\.tà)$/i.test(nonEmpty[0] ?? "")) {
    return true;
  }
  return false;
}

export type ColumnKey =
  | "codice"
  | "codiceOEM"
  | "descrizione"
  | "categoria"
  | "um"
  | "prezzoListino"
  | "fornitore"
  | "codiceFornitore"
  | "leadTimeGiorni"
  | "macchinaCompatibile"
  | "stato"
  | "ignore";

const HEADER_ALIASES: Record<ColumnKey, RegExp[]> = {
  codice: [
    /^codice$/i,
    /^cod\.?$/i,
    /^code$/i,
    /^codice\s*ricambio$/i,
    /^codice\s*interno$/i,
    /^articolo$/i,
    /^codart$/i,
  ],
  codiceOEM: [/^oem$/i, /^codice\s*oem$/i, /^cod\.?\s*oem$/i, /^mpn$/i],
  descrizione: [
    /^descrizione$/i,
    /^desart$/i,
    /^description$/i,
    /^desc\.?$/i,
    /^articolo\s*descr/i,
  ],
  categoria: [/^categoria$/i, /^category$/i, /^tipo$/i, /^famiglia$/i],
  um: [/^um$/i, /^u\.?m\.?$/i, /^unit[aà]?$/i, /^unità$/i],
  prezzoListino: [
    /^prezzo/i,
    /^listino/i,
    /^price/i,
    /^importo/i,
    /^prezzoul$/i,
    /^netto/i,
  ],
  fornitore: [/^fornitore$/i, /^supplier$/i, /^ragsocforn$/i, /^vendor$/i],
  codiceFornitore: [
    /^codice\s*fornitore$/i,
    /^cod\.?\s*forn/i,
    /^codforn$/i,
    /^supplier\s*code$/i,
  ],
  leadTimeGiorni: [/^lt/i, /^lead/i, /^gg$/i, /^giorni$/i, /^ltgg$/i],
  macchinaCompatibile: [
    /^macchina/i,
    /^modello/i,
    /^compatib/i,
    /^applicab/i,
    /^serial/i,
    /^matricola/i,
  ],
  stato: [/^stato$/i, /^status$/i, /^attivo$/i],
  ignore: [],
};

/** Individua la riga header euristicamente (non sempre riga 0). */
export function findHeaderRow(grid: string[][]): number {
  let bestIdx = 0;
  let bestScore = -1;
  const maxScan = Math.min(grid.length, 25);
  for (let i = 0; i < maxScan; i++) {
    const row = grid[i] ?? [];
    let score = 0;
    for (const cell of row) {
      const t = cell.trim();
      if (!t) continue;
      for (const [key, patterns] of Object.entries(HEADER_ALIASES)) {
        if (key === "ignore") continue;
        if (patterns.some((p) => p.test(t))) {
          score += key === "codice" || key === "descrizione" ? 3 : 1;
          break;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestScore >= 2 ? bestIdx : 0;
}

/** Mappa colonne da header (euristica). */
export function mapColumnsHeuristic(headers: string[]): Record<number, ColumnKey> {
  const map: Record<number, ColumnKey> = {};
  const used = new Set<ColumnKey>();
  headers.forEach((h, idx) => {
    const t = h.trim();
    if (!t) return;
    for (const [key, patterns] of Object.entries(HEADER_ALIASES) as [
      ColumnKey,
      RegExp[],
    ][]) {
      if (key === "ignore" || used.has(key)) continue;
      if (patterns.some((p) => p.test(t))) {
        map[idx] = key;
        used.add(key);
        return;
      }
    }
  });
  return map;
}

export type ExtractedRow = {
  codice: string;
  codiceOEM?: string;
  descrizione: string;
  categoria?: string;
  um?: string;
  prezzoListino?: number | null;
  fornitore?: string;
  codiceFornitore?: string;
  leadTimeGiorni?: number | null;
  macchinaCompatibile?: string;
  stato?: SparePartStatus;
  source: SparePartSource;
};

function cell(row: string[], idx: number | undefined): string {
  if (idx == null) return "";
  return (row[idx] ?? "").trim();
}

/** Converte griglia + mappa colonne in righe ricambio. */
export function rowsFromGrid(
  grid: string[][],
  headerIdx: number,
  colMap: Record<number, ColumnKey>,
  sourceBase: Omit<SparePartSource, "row">
): ExtractedRow[] {
  const out: ExtractedRow[] = [];
  const byKey = new Map<ColumnKey, number>();
  for (const [idx, key] of Object.entries(colMap)) {
    byKey.set(key, Number(idx));
  }
  const codiceIdx = byKey.get("codice");
  const descIdx = byKey.get("descrizione");

  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    if (isJunkRow(row.map((c) => String(c ?? "")))) continue;
    const codice = cell(row, codiceIdx);
    const descrizione = cell(row, descIdx) || codice;
    if (!codice) continue;
    // Scarta se codice sembra un'intestazione
    if (/^(codice|code|articolo)$/i.test(codice)) continue;

    const prezzoRaw = cell(row, byKey.get("prezzoListino"));
    const ltRaw = cell(row, byKey.get("leadTimeGiorni"));
    const statoRaw = cell(row, byKey.get("stato")).toLowerCase();
    let stato: SparePartStatus | undefined;
    if (statoRaw.includes("obsol")) stato = "obsoleto";
    else if (statoRaw.includes("sostit")) stato = "sostituito";
    else if (statoRaw.includes("attiv") || statoRaw === "a") stato = "attivo";

    const lt = ltRaw ? Number(String(ltRaw).replace(",", ".")) : null;

    out.push({
      codice: codice.toUpperCase(),
      codiceOEM: cell(row, byKey.get("codiceOEM")) || undefined,
      descrizione,
      categoria: cell(row, byKey.get("categoria")) || undefined,
      um: cell(row, byKey.get("um")) || undefined,
      prezzoListino: parseItalianPrice(prezzoRaw),
      fornitore: cell(row, byKey.get("fornitore")) || undefined,
      codiceFornitore: cell(row, byKey.get("codiceFornitore")) || undefined,
      leadTimeGiorni: Number.isFinite(lt) ? lt : null,
      macchinaCompatibile:
        cell(row, byKey.get("macchinaCompatibile")) || undefined,
      stato,
      source: { ...sourceBase, row: r + 1 },
    });
  }
  return out;
}

type FieldKey = keyof Pick<
  SparePart,
  | "codiceOEM"
  | "descrizione"
  | "categoria"
  | "um"
  | "prezzoListino"
  | "fornitore"
  | "codiceFornitore"
  | "leadTimeGiorni"
  | "macchinaCompatibile"
  | "stato"
>;

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.001;
  }
  return String(a ?? "").trim() === String(b ?? "").trim();
}

/**
 * Merge estratti in anagrafica esistente.
 * Se campo già valorizzato e nuovo valore differisce → non sovrascrivere, marca daVerificare.
 */
export function mergeExtractedParts(
  existing: SparePart[],
  extracted: ExtractedRow[]
): SparePart[] {
  const byCode = new Map<string, SparePart>();
  for (const p of existing) {
    byCode.set(p.codice.toUpperCase(), { ...p, sorgenti: [...p.sorgenti] });
  }

  for (const row of extracted) {
    const key = row.codice.toUpperCase();
    const prev = byCode.get(key);
    if (!prev) {
      const created: SparePart = {
        id: newSparePartId(),
        codice: key,
        codiceOEM: row.codiceOEM,
        descrizione: row.descrizione,
        categoria: row.categoria,
        um: row.um,
        prezzoListino: row.prezzoListino,
        fornitore: row.fornitore,
        codiceFornitore: row.codiceFornitore,
        leadTimeGiorni: row.leadTimeGiorni,
        macchinaCompatibile: row.macchinaCompatibile,
        stato: row.stato ?? "attivo",
        completezza: 0,
        sorgenti: [row.source],
        succedanei: [],
        daVerificare: false,
      };
      created.completezza = computeSpareCompleteness(created);
      byCode.set(key, created);
      continue;
    }

    const conflicts = new Set(prev.conflictFields ?? []);
    const assign = <K extends FieldKey>(field: K, incoming: SparePart[K]) => {
      if (incoming == null || incoming === "") return;
      const cur = prev[field];
      if (cur == null || cur === "") {
        (prev as SparePart)[field] = incoming as never;
        return;
      }
      if (!valuesEqual(cur, incoming)) {
        conflicts.add(field);
        prev.daVerificare = true;
      }
    };

    assign("codiceOEM", row.codiceOEM);
    assign("descrizione", row.descrizione);
    assign("categoria", row.categoria);
    assign("um", row.um);
    assign("prezzoListino", row.prezzoListino);
    assign("fornitore", row.fornitore);
    assign("codiceFornitore", row.codiceFornitore);
    assign("leadTimeGiorni", row.leadTimeGiorni);
    assign("macchinaCompatibile", row.macchinaCompatibile);
    if (row.stato) assign("stato", row.stato);

    const srcKey = `${row.source.fileId}:${row.source.sheet ?? ""}:${row.source.row ?? ""}`;
    if (
      !prev.sorgenti.some(
        (s) =>
          `${s.fileId}:${s.sheet ?? ""}:${s.row ?? ""}` === srcKey
      )
    ) {
      prev.sorgenti.push(row.source);
    }
    prev.conflictFields = [...conflicts];
    prev.completezza = computeSpareCompleteness(prev);
    byCode.set(key, prev);
  }

  return Array.from(byCode.values()).sort((a, b) =>
    a.codice.localeCompare(b.codice, "it")
  );
}
