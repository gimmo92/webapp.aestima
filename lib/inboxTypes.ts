// =============================================================
// Tipi della dashboard "unibox" after-sales (richieste ricambi)
// =============================================================

/** Identificatori degli stati di una richiesta ricambio. */
export type RequestStatus =
  | "nuova"
  | "da_identificare"
  | "identificata"
  | "preventivo_pronto"
  | "inviata"
  | "attesa_fornitore"
  | "vinta"
  | "persa";

/** Configurazione di uno stato: etichetta leggibile, colore, descrizione. */
export interface StatusConfig {
  id: RequestStatus;
  label: string;
  /** Colore esadecimale (usato inline: i colori dinamici non passano dal purge di Tailwind). */
  color: string;
  description: string;
}

/** Etichetta custom applicabile a una richiesta (Urgente, Garanzia, ...). */
export interface Label {
  id: string;
  name: string;
  color: string;
}

/**
 * Una richiesta ricambio in arrivo (come un'email nella inbox).
 *
 * In PRODUZIONE questi oggetti verrebbero popolati dalla casella email
 * reale del cliente (via IMAP o API del provider) e lo `status` /
 * `labelIds` verrebbero persistiti su un database. Qui è tutto mock.
 */
export interface PartRequest {
  id: string;
  /** Nome del referente che ha scritto. */
  from: string;
  /** Email del mittente. */
  fromEmail: string;
  /** Azienda cliente. */
  company: string;
  /** Oggetto dell'email. */
  subject: string;
  /** Corpo dell'email originale (testo del cliente, vago, senza codice). */
  body: string;
  /** Etichetta breve per la lista (es. "09:12", "ieri", "lun"). */
  receivedLabel: string;
  /** Data/ora estesa per il dettaglio. */
  receivedFull: string;
  status: RequestStatus;
  /** Etichette applicate (id che referenziano `Label`). */
  labelIds: string[];
  /** Tab "Primarie" (true) o "Altre" (false). */
  primary: boolean;
}
