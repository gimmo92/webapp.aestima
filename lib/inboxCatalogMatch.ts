import type { SparePart } from "@/lib/sparePartTypes";

export function findCatalogPartInText(
  text: string,
  parts: SparePart[]
): SparePart | null {
  const hay = text.toUpperCase();
  let best: SparePart | null = null;
  let bestLen = 0;
  for (const part of parts) {
    for (const raw of [part.codice, part.codiceOEM]) {
      const code = (raw ?? "").trim().toUpperCase();
      if (code.length < 4 || !hay.includes(code)) continue;
      if (code.length > bestLen) {
        best = part;
        bestLen = code.length;
      }
    }
  }
  return best;
}

export function extractRequestedQty(text: string): number {
  const m =
    text.match(/(\d+)\s*(?:pz|pezzi|pcs|pezz)/i) ||
    text.match(/quantit[aà]\s*[:.]?\s*(\d+)/i) ||
    text.match(/[×x]\s*(\d+)/i);
  const n = m ? Number(m[1]) : 1;
  return Number.isFinite(n) && n > 0 && n < 1000 ? n : 1;
}

/** True se dal catalogo si può aprire Crea offerta (non obsoleto, con prezzo). */
export function isSparePartOfferable(part: SparePart): boolean {
  if (part.stato === "obsoleto" || part.stato === "sostituito") return false;
  if (part.disponibile === false) return false;
  return (part.prezzoListino ?? 0) > 0;
}
