import { COMPANY, euro } from "./quote";
import type { AnalysisResult, BomComponent, Machine, Quote } from "./types";
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

  if (component.bomRef) {
    const laborLine = quote.lines.find((l) => l.code.startsWith("MO-"));
    const partsCount = quote.lines.filter((l) => !l.code.startsWith("MO-")).length;
    return `Gentile ${firstName},

grazie per la Sua richiesta. Abbiamo identificato l'assieme per ${machine.model} (matricola ${machine.serial}) consultando la distinta base ${component.code}:

• ${component.description}
  Righe distinta: ${partsCount} ricambi${laborLine ? ` + ${laborLine.qty} h montaggio` : ""}
  Rif. archivio: ${component.bomRef}

${dispo}

Totale offerta (IVA incl.): ${euro(quote.total)} — rif. ${quote.number}.
Trova in allegato il preventivo dettagliato con tutti i componenti e le ore uomo. L'offerta è valida 30 giorni.

Restiamo a disposizione per procedere con l'ordine.

Cordiali saluti,
${COMPANY.name}
${COMPANY.email} · ${COMPANY.phone}`;
  }

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

/**
 * Bozza di risposta al cliente quando non è possibile identificare
 * il ricambio: chiede informazioni aggiuntive invece di un preventivo.
 */
export function buildInfoRequestReply(
  request: PartRequest,
  analysis: AnalysisResult,
  machine: Machine | null
): string {
  const firstName = request.from.split(" ")[0] ?? "";
  const serial =
    analysis.numero_serie || machine?.serial || null;
  const componente = analysis.componente_identificato?.trim();
  const componenteNote =
    componente && componente !== "componente non specificato"
      ? ` (“${componente}”)`
      : "";

  const serialPhrase = serial
    ? ` per la matricola ${serial}`
    : " ma non abbiamo ancora la matricola della macchina";

  return `Gentile ${firstName},

grazie per la Sua richiesta. Per individuare il ricambio corretto abbiamo bisogno di alcune informazioni aggiuntive.

Dalla Sua descrizione${componenteNote}${serialPhrase} non ci è ancora possibile confermare il componente esatto nella distinta.

Ci può cortesemente indicare:
• Quale componente o zona della macchina è interessata (se possibile con foto)
• Eventuali codici o riferimenti presenti sul pezzo
• Se la macchina è ferma in produzione

Ricevute queste informazioni le invieremo il preventivo il prima possibile.

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
