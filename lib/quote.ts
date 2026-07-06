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

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Ricalcola in modo deterministico i totali del preventivo a partire
 * dalle righe e dalle percentuali (maggiorazione urgenza + IVA).
 * Usato dopo una modifica (anche via LLM): l'LLM cambia solo i campi
 * "editabili", i totali li ricalcoliamo noi per evitare errori aritmetici.
 */
export function recomputeTotals(
  lines: QuoteLine[],
  urgencySurchargePct: number,
  vatPct: number
): {
  lines: QuoteLine[];
  subtotal: number;
  urgencySurcharge: number;
  vat: number;
  total: number;
} {
  const normLines = lines.map((l) => ({
    ...l,
    qty: Number(l.qty) || 0,
    unitPrice: round2(Number(l.unitPrice) || 0),
    total: round2((Number(l.qty) || 0) * (Number(l.unitPrice) || 0)),
  }));
  const subtotal = round2(normLines.reduce((acc, l) => acc + l.total, 0));
  const urgencySurcharge = round2((subtotal * urgencySurchargePct) / 100);
  const taxable = subtotal + urgencySurcharge;
  const vat = round2((taxable * vatPct) / 100);
  const total = round2(taxable + vat);
  return { lines: normLines, subtotal, urgencySurcharge, vat, total };
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
