// Tipi condivisi tra API e UI della chat di assistenza service.

import type { ChatAttachment } from "./serviceChatAttachments";
import type { ChatAttachmentPayload } from "./serviceChatAttachments";
import type { ChatTicketPreview } from "./ticketTypes";

export type { ChatAttachment, ChatAttachmentPayload };

export type ChatRole = "user" | "assistant";

/** Messaggio nella cronologia conversazione (stateless lato API). */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  attachments?: ChatAttachmentPayload[];
}

/** Ricambio proposto dall'agente (solo se trovato in distinta). */
export interface SparePartProposal {
  code: string;
  description: string;
  price: number;
  availability: "disponibile" | "da_ordinare";
  leadTimeDays?: number;
}

/** Ticket aperto — solo per messaggi storici salvati in conversazione. */
export type ServiceTicket = ChatTicketPreview;

/** Match con voce knowledge base — soluzione appresa da intervento precedente. */
export interface KbMatchPreview {
  entryId: string;
  symptom: string;
  frequency?: number;
}

/** Feedback utente su soluzione proposta dalla KB. */
export type KbFeedbackStatus =
  | "pending"
  | "updating"
  | "helpful"
  | "not_helpful";

/** Opzione quick-reply: label in UI, value inviato come messaggio utente. */
export interface QuickReplyOption {
  label: string;
  value: string;
}

/** Risposta strutturata dell'API /api/service-chat. */
export interface ServiceChatResponse {
  message: string;
  spareParts?: SparePartProposal[];
  kbMatch?: KbMatchPreview;
  /** true se il turno corrente include ricerca nella KB */
  kbSearching?: boolean;
  quickReplies?: QuickReplyOption[];
  source: "anthropic" | "fallback";
}

/** Messaggio visualizzato nella UI (include metadati strutturati). */
export interface DisplayMessage {
  id: string;
  role: ChatRole;
  content: string;
  spareParts?: SparePartProposal[];
  ticket?: ServiceTicket;
  kbMatch?: KbMatchPreview;
  /** Stato feedback su soluzione KB */
  kbFeedback?: KbFeedbackStatus;
  quickReplies?: QuickReplyOption[];
  attachments?: ChatAttachment[];
  isError?: boolean;
  /** Risposta inviata da un operatore umano (inbox conversazioni). */
  isOperatorReply?: boolean;
}
