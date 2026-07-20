// =============================================================
// Tipi — inbox conversazioni live chat / embed
// In produzione persistite su DB e sincronizzate in tempo reale.
// =============================================================

import type { SparePartProposal } from "./serviceChatTypes";
import type { ChatTicketPreview } from "./ticketTypes";

export type ConversationStatus = "aperto" | "risolto";

export type ConversationAssignee = "ai" | "operatore";

export type ConversationChannel = "live_chat" | "embed" | "assistenza" | "inbox";

export type ConversationMessageRole = "user" | "assistant" | "agent";

export interface StoredConversationMessage {
  id: string;
  role: ConversationMessageRole;
  content: string;
  timestampLabel: string;
  spareParts?: SparePartProposal[];
  ticket?: ChatTicketPreview;
}

export interface ConversationRecord {
  id: string;
  customerName: string;
  customerEmail?: string;
  status: ConversationStatus;
  assignee: ConversationAssignee;
  assignedOperatorId?: string;
  channel: ConversationChannel;
  lastMessagePreview: string;
  lastMessageLabel: string;
  createdFull: string;
  updatedFull: string;
  messages: StoredConversationMessage[];
  machineModel?: string;
  machineSerial?: string;
  ticketId?: string;
  visitorOnline?: boolean;
}

export interface CreateConversationInput {
  customerName: string;
  customerEmail?: string;
  channel: ConversationChannel;
  machineModel?: string;
  machineSerial?: string;
  initialMessages?: StoredConversationMessage[];
  /** Se omesso, la conversazione resta assegnata all'AI. */
  assignee?: ConversationAssignee;
  assignedOperatorId?: string;
}

export interface UpdateConversationInput {
  status?: ConversationStatus;
  assignee?: ConversationAssignee;
  assignedOperatorId?: string | null;
  customerName?: string;
  machineModel?: string;
  machineSerial?: string;
  ticketId?: string;
  visitorOnline?: boolean;
}

export interface AppendConversationMessageInput {
  role: ConversationMessageRole;
  content: string;
  spareParts?: SparePartProposal[];
  ticket?: ChatTicketPreview;
}
