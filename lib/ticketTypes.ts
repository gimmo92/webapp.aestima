// =============================================================
// Tipi — sistema ticketing service after-sales
// In produzione i ticket verrebbero persistiti su DB/CMMS e
// sincronizzati con email, chat AI e assegnazioni tecnici.
// =============================================================

export type TicketStatus =
  | "aperto"
  | "assegnato"
  | "in_lavorazione"
  | "in_attesa_cliente"
  | "risolto"
  | "chiuso";

export type TicketPriority = "normale" | "alta";

export type TicketSource = "chat_ai" | "manuale" | "inbox";

export type TicketCategory = "ricambio" | "troubleshooting" | "altro";

export interface TicketStatusConfig {
  id: TicketStatus;
  label: string;
  color: string;
}

/** Ticket completo nel sistema (tab Ticket). */
export interface ServiceTicketRecord {
  id: string;
  status: TicketStatus;
  priority: TicketPriority;
  source: TicketSource;
  category: TicketCategory;
  /** Titolo breve / oggetto */
  summary: string;
  /** Descrizione estesa del problema */
  description: string;
  machineModel?: string;
  machineSerial?: string;
  assignedTechnicianId?: string;
  createdLabel: string;
  createdFull: string;
  updatedFull: string;
  internalNotes?: string;
  /** Soluzione scritta dal tecnico alla chiusura */
  solution?: string;
  /** Voce KB generata da questo ticket */
  knowledgeEntryId?: string;
}

/** Anteprima ticket restituita dalla chat AI (subset). */
export type ChatTicketPreview = Pick<ServiceTicketRecord, "id" | "summary">;

export interface CreateTicketInput {
  id?: string;
  summary: string;
  description?: string;
  source: TicketSource;
  category?: TicketCategory;
  priority?: TicketPriority;
  machineModel?: string;
  machineSerial?: string;
}

export interface UpdateTicketInput {
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedTechnicianId?: string | null;
  internalNotes?: string;
  description?: string;
  solution?: string;
  knowledgeEntryId?: string;
}
