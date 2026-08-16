// =============================================================
// Tipi — sistema ticketing service after-sales
// In produzione i ticket verrebbero persistiti su DB/CMMS e
// sincronizzati con email, chat AI e assegnazioni tecnici.
// =============================================================

/** ID stage ticket — i default restano aperti/assegnato/…, in settings se ne possono aggiungere. */
export type TicketStatus = string;

export type TicketPriority = "normale" | "alta";

export type TicketSource = "chat_ai" | "manuale" | "inbox" | "form";

export type TicketCategory = "ricambio" | "troubleshooting" | "altro";

export interface TicketStatusConfig {
  id: TicketStatus;
  label: string;
  color: string;
}

/** Stage configurabile (impostazioni ticketing + coda kanban). */
export interface TicketStage {
  id: TicketStatus;
  label: string;
  color: string;
  /** Compare come colonna nella Coda ticket. */
  inBoard: boolean;
  /** Conta come chiuso/risolto nella lista. */
  terminal: boolean;
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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  formExtra?: Record<string, string>;
  attachments?: TicketAttachmentMeta[];
}

export interface TicketAttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  sizeLabel: string;
  kind: "image" | "document";
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
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
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
