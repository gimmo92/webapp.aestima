import type {
  SparePart,
  SparePartImage,
  SparePartSource,
  SparePartStatus,
} from "./sparePartTypes";
import {
  computeSpareCompleteness,
  newSparePartId,
} from "./sparePartTypes";
import type { SpareDbField } from "./sparePartMapping";
import { isSpareDbField } from "./sparePartMapping";
import { applyDiscontinuedPrefix, applyDiscontinuedToSparePart } from "./discontinuedSparePart";

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

export type ColumnKey = SpareDbField;

const HEADER_ALIASES: Record<ColumnKey, RegExp[]> = {
  codice: [
    /^codice$/i,
    /^codice\s*\/\s*part/i,
    /^part\s*number$/i,
    /^p\/?n$/i,
    /^cod\.?$/i,
    /^code$/i,
    /^codice\s*ricambio$/i,
    /^codice\s*interno$/i,
    /^articolo$/i,
    /^codart$/i,
  ],
  codiceOEM: [/^oem$/i, /^codice\s*oem$/i, /^cod\.?\s*oem$/i, /^mpn$/i],
  nome: [/^nome/i, /^name$/i, /^product\s*name$/i, /^titolo$/i],
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
    /^sku$/i,
  ],
  brand: [/^brand/i, /^marchio$/i, /^marca$/i],
  produttore: [/^produttore/i, /^manufacturer$/i, /^costruttore$/i],
  leadTimeGiorni: [/^lt/i, /^lead/i, /^gg$/i, /^giorni$/i, /^ltgg$/i],
  macchinaCompatibile: [
    /^macchina/i,
    /^modello/i,
    /^compatib/i,
    /^applicab/i,
    /^serial/i,
    /^matricola/i,
  ],
  disponibile: [
    /^disponib/i,
    /^in\s*stock$/i,
    /^stock$/i,
    /^giacenza$/i,
  ],
  stato: [/^stato$/i, /^status$/i, /^attivo$/i],
  immaginePercorso: [
    /^percorso\s*immagin/i,
    /^path\s*immagin/i,
    /^image\s*path$/i,
    /^foto\s*path$/i,
  ],
  immagineUrl: [
    /^url\s*immagin/i,
    /^image\s*url$/i,
    /^foto\s*url$/i,
    /^cdn/i,
  ],
  ignore: [
    /^#$/,
    /^n\.?$/i,
    /^nr$/i,
    /^immagine$/i,
    /^foto$/i,
    /^thumb/i,
    /^n\.?\s*immagin/i,
    /^link$/i,
    /^link\s*immagin/i,
  ],
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
    if (!t) {
      map[idx] = "ignore";
      return;
    }
    for (const [key, patterns] of Object.entries(HEADER_ALIASES) as [
      ColumnKey,
      RegExp[],
    ][]) {
      if (!patterns.some((p) => p.test(t))) continue;
      if (key === "ignore") {
        map[idx] = "ignore";
        return;
      }
      if (used.has(key)) continue;
      map[idx] = key;
      used.add(key);
      return;
    }
    if (!map[idx]) map[idx] = "ignore";
  });
  return map;
}

export function normalizeColumnMap(
  raw: Record<string, string> | Record<number, string>
): Record<number, ColumnKey> {
  const out: Record<number, ColumnKey> = {};
  for (const [k, v] of Object.entries(raw)) {
    const idx = Number(k);
    if (!Number.isFinite(idx) || !isSpareDbField(v)) continue;
    out[idx] = v;
  }
  return out;
}

export function parseDisponibile(raw: string): boolean | undefined {
  const s = raw.trim().toLowerCase();
  if (!s) return undefined;
  if (/^(sì|si|yes|true|1|y|ok|in stock|disponibile)$/i.test(s)) return true;
  if (/^(no|false|0|n|out of stock|non disponibile|esaurito)$/i.test(s)) {
    return false;
  }
  return undefined;
}

export async function sheetsFromExcelBuffer(
  buffer: Buffer,
  fileName: string
): Promise<{ sheetName: string; grid: string[][] }[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheets: { sheetName: string; grid: string[][] }[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as string[][];
    if (grid.length < 2) continue;
    if (/parametr|analisi|note/i.test(sheetName) && grid.length < 15) continue;
    sheets.push({
      sheetName,
      grid: grid.map((r) => r.map((c) => String(c ?? ""))),
    });
  }
  if (sheets.length === 0 && /csv$/i.test(fileName)) {
    // xlsx legge anche i csv
  }
  return sheets;
}

export type ExtractedRow = {
  codice: string;
  codiceOEM?: string;
  nome?: string;
  descrizione: string;
  categoria?: string;
  um?: string;
  prezzoListino?: number | null;
  fornitore?: string;
  codiceFornitore?: string;
  brand?: string;
  produttore?: string;
  leadTimeGiorni?: number | null;
  macchinaCompatibile?: string;
  disponibile?: boolean | null;
  stato?: SparePartStatus;
  immagini: SparePartImage[];
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
    if (key === "ignore") continue;
    byKey.set(key, Number(idx));
  }
  const codiceIdx = byKey.get("codice");
  const descIdx = byKey.get("descrizione");
  const nomeIdx = byKey.get("nome");

  for (let r = headerIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    if (isJunkRow(row.map((c) => String(c ?? "")))) continue;
    const codice =
      cell(row, codiceIdx) || cell(row, byKey.get("codiceOEM"));
    const nome = cell(row, nomeIdx) || undefined;
    const descrizione = cell(row, descIdx) || nome || codice;
    if (!codice) continue;
    if (/^(codice|code|articolo)$/i.test(codice)) continue;

    const prezzoRaw = cell(row, byKey.get("prezzoListino"));
    const ltRaw = cell(row, byKey.get("leadTimeGiorni"));
    const statoRaw = cell(row, byKey.get("stato")).toLowerCase();
    let stato: SparePartStatus | undefined;
    if (statoRaw.includes("obsol")) stato = "obsoleto";
    else if (statoRaw.includes("sostit")) stato = "sostituito";
    else if (statoRaw.includes("attiv") || statoRaw === "a") stato = "attivo";

    const lt = ltRaw ? Number(String(ltRaw).replace(",", ".")) : null;
    const path = cell(row, byKey.get("immaginePercorso"));
    const url = cell(row, byKey.get("immagineUrl"));
    const immagini: SparePartImage[] = [];
    if (path || url) {
      immagini.push({
        path: path || undefined,
        url: url || undefined,
        role: "primary",
      });
    }

    const cleaned = applyDiscontinuedPrefix({
      codice,
      nome,
      descrizione,
      stato,
    });

    out.push({
      codice: codice.toUpperCase(),
      codiceOEM: cell(row, byKey.get("codiceOEM")) || undefined,
      nome: cleaned.nome || undefined,
      descrizione: cleaned.descrizione || codice,
      categoria: cell(row, byKey.get("categoria")) || undefined,
      um: cell(row, byKey.get("um")) || undefined,
      prezzoListino: parseItalianPrice(prezzoRaw),
      fornitore: cell(row, byKey.get("fornitore")) || undefined,
      codiceFornitore: cell(row, byKey.get("codiceFornitore")) || undefined,
      brand: cell(row, byKey.get("brand")) || undefined,
      produttore: cell(row, byKey.get("produttore")) || undefined,
      leadTimeGiorni: Number.isFinite(lt) ? lt : null,
      macchinaCompatibile:
        cell(row, byKey.get("macchinaCompatibile")) || undefined,
      disponibile: parseDisponibile(cell(row, byKey.get("disponibile"))) ?? null,
      stato: (cleaned.stato as SparePartStatus | undefined) ?? undefined,
      immagini,
      source: { ...sourceBase, row: r + 1 },
    });
  }
  return out;
}

type FieldKey = keyof Pick<
  SparePart,
  | "codiceOEM"
  | "nome"
  | "descrizione"
  | "categoria"
  | "um"
  | "prezzoListino"
  | "fornitore"
  | "codiceFornitore"
  | "brand"
  | "produttore"
  | "leadTimeGiorni"
  | "macchinaCompatibile"
  | "disponibile"
  | "stato"
>;

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true;
  if (typeof a === "boolean" && typeof b === "boolean") return a === b;
  if (typeof a === "number" && typeof b === "number") {
    return Math.abs(a - b) < 0.001;
  }
  return String(a ?? "").trim() === String(b ?? "").trim();
}

function mergeImages(existing: SparePartImage[], incoming: SparePartImage[]) {
  const out = [...existing];
  for (const img of incoming) {
    const key = `${img.url ?? ""}|${img.path ?? ""}`;
    if (!img.url && !img.path) continue;
    if (out.some((e) => `${e.url ?? ""}|${e.path ?? ""}` === key)) continue;
    out.push(img);
  }
  return out;
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
    const cleaned = applyDiscontinuedToSparePart(p);
    byCode.set(p.codice.toUpperCase(), {
      ...cleaned,
      sorgenti: [...cleaned.sorgenti],
      immagini: [...(cleaned.immagini ?? [])],
    });
  }

  for (const row of extracted) {
    const key = row.codice.toUpperCase();
    const prev = byCode.get(key);
    if (!prev) {
      const created: SparePart = {
        id: newSparePartId(),
        codice: key,
        codiceOEM: row.codiceOEM,
        nome: row.nome,
        descrizione: row.descrizione,
        categoria: row.categoria,
        um: row.um,
        prezzoListino: row.prezzoListino,
        fornitore: row.fornitore,
        codiceFornitore: row.codiceFornitore,
        brand: row.brand,
        produttore: row.produttore,
        leadTimeGiorni: row.leadTimeGiorni,
        macchinaCompatibile: row.macchinaCompatibile,
        disponibile: row.disponibile,
        stato: row.stato ?? "attivo",
        completezza: 0,
        immagini: row.immagini,
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
    assign("nome", row.nome);
    assign("descrizione", row.descrizione);
    assign("categoria", row.categoria);
    assign("um", row.um);
    assign("prezzoListino", row.prezzoListino);
    assign("fornitore", row.fornitore);
    assign("codiceFornitore", row.codiceFornitore);
    assign("brand", row.brand);
    assign("produttore", row.produttore);
    assign("leadTimeGiorni", row.leadTimeGiorni);
    assign("macchinaCompatibile", row.macchinaCompatibile);
    assign("disponibile", row.disponibile);
    if (row.stato) assign("stato", row.stato);
    prev.immagini = mergeImages(prev.immagini ?? [], row.immagini);

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

export type ColumnMappingPayload = {
  sheetName?: string;
  headerIdx?: number;
  columns: Record<string, string>;
};

/** Estrae ricambi da un workbook usando la mappa colonne confermata. */
export async function extractRowsFromMappedWorkbook(
  buffer: Buffer,
  fileName: string,
  fileId: string,
  mapping: ColumnMappingPayload
): Promise<ExtractedRow[]> {
  const colMap = normalizeColumnMap(mapping.columns);
  const mapped = Object.values(colMap);
  if (!mapped.includes("codice") && !mapped.includes("codiceOEM")) return [];
  const sheets = await sheetsFromExcelBuffer(buffer, fileName);
  const preferred =
    sheets.find((s) => s.sheetName === mapping.sheetName) ?? sheets[0];
  if (!preferred) return [];
  const headerIdx =
    mapping.headerIdx != null && mapping.headerIdx >= 0
      ? mapping.headerIdx
      : findHeaderRow(preferred.grid);
  return rowsFromGrid(preferred.grid, headerIdx, colMap, {
    fileId,
    fileName,
    sheet: preferred.sheetName,
  });
}
