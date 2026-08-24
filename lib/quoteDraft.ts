import type { QuoteLine } from "@/lib/types";

const KEY = "aftercore:quote-draft";

export type QuoteDraftLine = {
  code: string;
  description: string;
  unitPrice: number;
  qty: number;
};

function canUseStorage() {
  return typeof window !== "undefined";
}

export function readQuoteDraft(): QuoteDraftLine[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const code = typeof r.code === "string" ? r.code.trim() : "";
        if (!code) return null;
        const qty = Number(r.qty);
        const unitPrice = Number(r.unitPrice);
        return {
          code,
          description:
            typeof r.description === "string" ? r.description : code,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          qty: Number.isFinite(qty) && qty > 0 ? qty : 1,
        };
      })
      .filter((row): row is QuoteDraftLine => row !== null);
  } catch {
    return [];
  }
}

export function writeQuoteDraft(lines: QuoteDraftLine[]) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* quota / private mode */
  }
}

export function clearQuoteDraft() {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasQuoteDraft() {
  return readQuoteDraft().length > 0;
}

/** Aggiunge (o incrementa) una riga nella bozza offerta. */
export function addToQuoteDraft(line: QuoteDraftLine): QuoteDraftLine[] {
  const current = readQuoteDraft();
  const key = line.code.trim().toUpperCase();
  const idx = current.findIndex((l) => l.code.toUpperCase() === key);
  const next =
    idx >= 0
      ? current.map((l, i) =>
          i === idx
            ? {
                ...l,
                qty: l.qty + (line.qty || 1),
                description: line.description || l.description,
                unitPrice: line.unitPrice || l.unitPrice,
              }
            : l
        )
      : [...current, { ...line, qty: line.qty || 1 }];
  writeQuoteDraft(next);
  return next;
}

export function draftToQuoteLines(lines: QuoteDraftLine[]): QuoteLine[] {
  return lines.map((l) => ({
    code: l.code,
    description: l.description,
    qty: l.qty,
    unitPrice: l.unitPrice,
    total: Math.round(l.qty * l.unitPrice * 100) / 100,
  }));
}
