import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";
import type { ColumnKey } from "@/lib/extractSpareParts";
import {
  mapColumnsHeuristic,
  normalizeColumnMap,
} from "@/lib/extractSpareParts";
import { SPARE_DB_FIELDS, isSpareDbField } from "@/lib/sparePartMapping";

const MAP_SYSTEM = `Sei un assistente che mappa colonne di un listino ricambi Excel sui campi anagrafica.
Campi ammessi:
${SPARE_DB_FIELDS.map((f) => `- ${f.key}: ${f.label} (${f.hint})`).join("\n")}

Regole:
- Ogni campo (tranne ignore) al massimo una volta.
- Il codice pezzo (part number / codice interno) va su "codice".
- MPN / OEM va su "codiceOEM", non su codice se esiste già un part number.
- Nome prodotto breve → nome; descrizione lunga → descrizione.
- Percorso file foto → immaginePercorso; URL http(s) foto → immagineUrl.
- Colonne inutili (#, miniatura incorporata, conteggio foto, link testuale "apri") → ignore.
Rispondi SOLO con JSON: {"0":"codice","1":"ignore",...} chiave = indice colonna.`;

function parseAiMap(text: string): Record<number, ColumnKey> | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(match ? match[0] : text) as Record<string, unknown>;
    const raw: Record<string, string> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && isSpareDbField(v)) raw[k] = v;
    }
    const out = normalizeColumnMap(raw);
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** Heuristica + (se disponibile) Claude. */
export async function suggestColumnMapping(
  headers: string[],
  sampleRows: string[][]
): Promise<{ map: Record<number, ColumnKey>; source: "ai" | "heuristic" }> {
  const heuristic = mapColumnsHeuristic(headers);
  if (!getAnthropicKey()) {
    return { map: heuristic, source: "heuristic" };
  }
  const llm = await callAnthropicMessages({
    system: MAP_SYSTEM,
    user: `Header (indice: testo):\n${headers
      .map((h, i) => `${i}: ${h || "(vuota)"}`)
      .join("\n")}\n\nPrime righe di esempio:\n${sampleRows
      .map((r, i) => `r${i + 1}: ${r.map((c) => c.slice(0, 80)).join(" | ")}`)
      .join("\n")}\n\nSuggerimento euristico: ${JSON.stringify(heuristic)}`,
    maxTokens: 900,
  });
  if (!llm.ok) return { map: heuristic, source: "heuristic" };
  const aiMap = parseAiMap(llm.text);
  if (!aiMap) return { map: heuristic, source: "heuristic" };
  const merged: Record<number, ColumnKey> = { ...heuristic, ...aiMap };
  for (let i = 0; i < headers.length; i++) {
    if (!merged[i]) merged[i] = "ignore";
  }
  return { map: merged, source: "ai" };
}

export type ExcelMappingPreview = {
  fileId: string;
  fileName: string;
  sheetName: string;
  headerIdx: number;
  rowCount: number;
  columns: {
    index: number;
    header: string;
    sample: string[];
    field: ColumnKey;
  }[];
};

function pickBestSheet(
  sheets: { sheetName: string; grid: string[][] }[]
): { sheetName: string; grid: string[][] } | null {
  const ranked = [...sheets].sort((a, b) => b.grid.length - a.grid.length);
  return ranked[0] ?? null;
}

/** Anteprima mapping da un buffer Excel/CSV (archivio o upload catalogo). */
export async function mappingPreviewFromExcel(
  buffer: Buffer,
  fileName: string,
  fileId: string
): Promise<{ preview: ExcelMappingPreview; source: "ai" | "heuristic" } | null> {
  const { findHeaderRow, sheetsFromExcelBuffer } = await import(
    "@/lib/extractSpareParts"
  );
  const sheets = await sheetsFromExcelBuffer(buffer, fileName);
  const best = pickBestSheet(sheets);
  if (!best) return null;
  const headerIdx = findHeaderRow(best.grid);
  const headers = (best.grid[headerIdx] ?? []).map((h) => String(h ?? ""));
  const sampleRows = best.grid
    .slice(headerIdx + 1, headerIdx + 4)
    .map((r) => headers.map((_, i) => String(r[i] ?? "")));
  const suggested = await suggestColumnMapping(headers, sampleRows);
  return {
    source: suggested.source,
    preview: {
      fileId,
      fileName,
      sheetName: best.sheetName,
      headerIdx,
      rowCount: Math.max(0, best.grid.length - headerIdx - 1),
      columns: headers.map((header, index) => ({
        index,
        header: header || `(colonna ${index + 1})`,
        sample: sampleRows
          .map((r) => r[index] ?? "")
          .filter(Boolean)
          .slice(0, 3),
        field: suggested.map[index] ?? "ignore",
      })),
    },
  };
}
