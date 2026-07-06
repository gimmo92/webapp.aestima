import { COMPANY, euro } from "./quote";
import type { BomComponent, Machine, Quote } from "./types";
import type { PartRequest } from "./inboxTypes";

// =============================================================
// GENERAZIONE BOZZE (risposta cliente + richiesta fornitore)
// -------------------------------------------------------------
// Le bozze sono generate come punto di partenza: l'operatore le
// può modificare e inviare dalla dashboard.
// =============================================================

/** Bozza di risposta al cliente con il preventivo. */
export function buildCustomerReply(
  request: PartRequest,
  machine: Machine,
  component: BomComponent,
  quote: Quote
): string {
  const firstName = request.from.split(" ")[0] ?? "";
  const dispo =
    quote.availability === "disponibile"
      ? "Il ricambio è disponibile a magazzino e pronto per la spedizione."
      : `Il ricambio è in fase di approvvigionamento: consegna stimata in ${quote.leadTimeDays} giorni lavorativi.`;

  return `Gentile ${firstName},

grazie per la Sua richiesta. Abbiamo identificato il ricambio per ${machine.model} (matricola ${machine.serial}):

• ${component.description}
  Codice: ${component.code}
  Prezzo unitario: ${euro(component.listPrice)}

${dispo}

Totale offerta (IVA incl.): ${euro(quote.total)} — rif. ${quote.number}.
Trova in allegato il preventivo dettagliato. L'offerta è valida 30 giorni.

Restiamo a disposizione per procedere con l'ordine.

Cordiali saluti,
${COMPANY.name}
${COMPANY.email} · ${COMPANY.phone}`;
}

/** Oggetto email per la richiesta al fornitore. */
export function buildSupplierSubject(component: BomComponent): string {
  return `Richiesta disponibilità — ${component.code}`;
}

/** Bozza di richiesta al fornitore quando il pezzo è mancante. */
export function buildSupplierRequest(
  machine: Machine,
  component: BomComponent
): string {
  return `Spett.le Fornitore,

richiediamo disponibilità e miglior tempo di consegna per il seguente ricambio:

• Descrizione: ${component.description}
  Codice interno: ${component.code}
  Applicazione: ${machine.model} (matr. ${machine.serial})
  Quantità: 1 pz

Preghiamo di indicare prezzo, disponibilità e lead time.

Cordiali saluti,
Ufficio Acquisti · ${COMPANY.name}`;
}
