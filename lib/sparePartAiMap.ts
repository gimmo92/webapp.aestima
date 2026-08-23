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
