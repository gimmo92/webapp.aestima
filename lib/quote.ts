import { COMPANY } from "./mockData";
import type {
  AnalysisResult,
  BomComponent,
  Machine,
  Quote,
  QuoteLine,
} from "./types";

// =============================================================
// GENERATORE PREVENTIVO
// -------------------------------------------------------------
// Costruisce l'oggetto Quote a partire dal componente identificato.
// Applica un ricarico se l'urgenza è alta.
// =============================================================

const URGENCY_SURCHARGE_PCT = 15; // % di maggiorazione per urgenza alta
const VAT_PCT = 22; // IVA italiana

const euro = (n: number) =>
  new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(n);

export { euro, COMPANY };

/** Numero preventivo pseudo-progressivo basato su data (solo per demo). */
function quoteNumber(): string {
  const year = new Date().getFullYear();
  const seq = String(Math.floor(Date.now() / 1000) % 10000).padStart(4, "0");
  return `PREV-${year}-${seq}`;
}

export function buildQuote(
  machine: Machine,
  component: BomComponent,
  analysis: AnalysisResult
): Quote {
  const qty = 1;
  const lineTotal = component.listPrice * qty;

  const lines: QuoteLine[] = [
    {
      code: component.code,
      description: `${component.description} — ${machine.model} (matr. ${machine.serial})`,
      qty,
      unitPrice: component.listPrice,
      total: lineTotal,
    },
  ];

  const subtotal = lines.reduce((acc, l) => acc + l.total, 0);

  const isUrgent = analysis.urgenza === "alta";
  const urgencySurchargePct = isUrgent ? URGENCY_SURCHARGE_PCT : 0;
  const urgencySurcharge = (subtotal * urgencySurchargePct) / 100;

  const taxable = subtotal + urgencySurcharge;
  const vat = (taxable * VAT_PCT) / 100;
  const total = taxable + vat;

  const availability = component.stock > 0 ? "disponibile" : "da_ordinare";

  return {
    number: quoteNumber(),
    date: new Date().toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    customerName: "Cliente (da confermare)",
    lines,
    subtotal,
    urgencySurcharge,
    urgencySurchargePct,
    vatPct: VAT_PCT,
    vat,
    total,
    availability,
    leadTimeDays: component.leadTimeDays,
    notes:
      availability === "disponibile"
        ? "Merce disponibile a magazzino, pronta per la spedizione."
        : `Componente da ordinare: consegna stimata in ${component.leadTimeDays} giorni lavorativi.`,
  };
}
