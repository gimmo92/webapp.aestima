// =============================================================
// Tipi — tab Fornitori (anagrafica + richieste inviate)
// =============================================================

/** Stato di una richiesta inviata a un fornitore. */
export type SupplierRequestStatus =
  | "bozza"
  | "inviata"
  | "in_attesa"
  | "risposta_ricevuta"
  | "confermata"
  | "annullata";

export interface SupplierRequestStatusConfig {
  id: SupplierRequestStatus;
  label: string;
  color: string;
}

/** Fornitore in anagrafica. */
export interface Supplier {
  id: string;
  name: string;
  email: string;
  /** Referente commerciale / tecnico. */
  contact?: string;
  /** Categorie o specializzazioni (es. "Pneumatica", "Cuscinetti"). */
  categories: string[];
  /** Note interne. */
  notes?: string;
}

/**
 * Richiesta di disponibilità inviata a un fornitore.
 * In PRODUZIONE verrebbe persistita su DB e collegata all'email
 * in uscita (SMTP/API). Qui è mock in memoria.
 */
export interface SupplierRequest {
  id: string;
  /** Richiesta ricambio inbox collegata. */
  partRequestId: string;
  supplierId: string;
  status: SupplierRequestStatus;
  subject: string;
  body: string;
  componentCode: string;
  componentDescription: string;
  machineModel: string;
  machineSerial: string;
  /** Etichetta breve data (es. "oggi", "ieri"). */
  sentLabel: string;
  /** Data estesa per il dettaglio. */
  sentFull: string;
}

/** Input per creare un nuovo fornitore (form o import). */
export type SupplierInput = Omit<Supplier, "id">;
