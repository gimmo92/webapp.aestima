import { recomputeTotals } from "./quote";
import type { Quote, QuoteLine } from "./types";

// =============================================================
// Fallback locale per la modifica del preventivo via istruzione
// -------------------------------------------------------------
// Usato quando la API key Anthropic non è configurata o la chiamata
// fallisce: interpreta con euristiche semplici le istruzioni più comuni
// (sconto, trasporto, quantità, urgenza) così la demo funziona sempre.
// =============================================================

const num = (s: string) => Number(s.replace(",", "."));

export function mockQuoteEdit(quote: Quote, instruction: string): Quote {
  const text = instruction.toLowerCase();
  let lines: QuoteLine[] = quote.lines.map((l) => ({ ...l }));
  let urgencySurchargePct = quote.urgencySurchargePct;
  let notes = quote.notes;

  // Sconto percentuale sulle righe (es. "applica 10% di sconto").
  const discount = text.match(/sconto[^\d]*(\d+(?:[.,]\d+)?)\s*%|(\d+(?:[.,]\d+)?)\s*%[^%]*sconto/);
  if (discount) {
    const pct = num(discount[1] ?? discount[2]);
    if (pct > 0 && pct < 100) {
      lines = lines.map((l) => ({
        ...l,
        unitPrice: (l.unitPrice * (100 - pct)) / 100,
      }));
      notes = `${notes} Applicato sconto del ${pct}%.`.trim();
    }
  }

  // Riga di trasporto/spedizione (es. "aggiungi trasporto 50€").
  const transport = text.match(/(?:trasport\w*|spedizion\w*)[^\d]*(\d+(?:[.,]\d+)?)/);
  if (transport) {
    const amount = num(transport[1]);
    if (amount > 0 && !lines.some((l) => l.code === "TRASP")) {
      lines.push({
        code: "TRASP",
        description: "Trasporto e spedizione",
        qty: 1,
        unitPrice: amount,
        total: amount,
      });
    }
  }

  // Quantità della prima riga (es. "metti quantità 2").
  const qty = text.match(/quantit[àa][^\d]*(\d+)/);
  if (qty && lines.length > 0) {
    lines[0] = { ...lines[0], qty: Number(qty[1]) };
  }

  // Urgenza / maggiorazione.
  if (/(senza|togli|rimuov\w*|no)\s+(urgenz|maggiorazion)/.test(text)) {
    urgencySurchargePct = 0;
  } else if (/(aggiung\w*|con|applica)\s+urgenz|urgent/.test(text)) {
    urgencySurchargePct = urgencySurchargePct || 15;
  }

  const totals = recomputeTotals(lines, urgencySurchargePct, quote.vatPct);

  return {
    ...quote,
    notes,
    urgencySurchargePct,
    ...totals,
  };
}
