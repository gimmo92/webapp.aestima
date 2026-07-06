import { mockAnalyze } from "./mockAnalyze";
import { matchAnalysisToData } from "./match";
import { buildQuote } from "./quote";
import type { PartRequest } from "./inboxTypes";
import type { BomComponent, Machine, Quote } from "./types";

// =============================================================
// CALCOLO OFFERTA (per la vista pipeline)
// -------------------------------------------------------------
// Deriva in modo DETERMINISTICO e sincrono (senza chiamare l'API)
// l'offerta associata a una richiesta, così la pipeline può
// mostrare valore e ricambio di ogni offerta all'istante.
// Usa l'analisi euristica locale + match sulla distinta mock.
// =============================================================

export interface Offer {
  quote: Quote;
  machine: Machine;
  component: BomComponent;
}

/** Numero offerta stabile derivato dall'id richiesta (per la demo). */
function stableOfferNumber(requestId: string): string {
  const digits = requestId.replace(/\D/g, "").padStart(4, "0").slice(-4);
  return `PREV-${new Date().getFullYear()}-${digits}`;
}

/** Calcola l'offerta per una richiesta, o null se non identificabile. */
export function computeOffer(request: PartRequest): Offer | null {
  const analysis = mockAnalyze(request.body);
  const match = matchAnalysisToData(analysis);
  if (!match.machine || !match.component) return null;

  const quote = buildQuote(match.machine, match.component, analysis);
  return {
    quote: { ...quote, number: stableOfferNumber(request.id) },
    machine: match.machine,
    component: match.component,
  };
}
