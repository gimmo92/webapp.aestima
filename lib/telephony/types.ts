import type { CallProposal } from "./classify";

export type CallDirection = "inbound" | "outbound";

export type CallOutcome = "answered" | "missed" | "voicemail";

/** Evento «chiamata terminata» già normalizzato, indipendente dal provider. */
export type NormalizedCallEvent = {
  externalId: string;
  direction: CallDirection;
  phone: string;
  durationSec: number | null;
  outcome: CallOutcome;
  recordingUrl: string | null;
  transcript: string | null;
  operatorName: string | null;
  occurredAt: string;
};

export type TelephonyCompany = {
  id: string;
  slug: string;
  settingsJson: unknown;
};

export type StoredCall = {
  id: string;
  externalId: string;
  ticketId: string | null;
  ticketStatus: string | null;
};

export type CallerSnapshot = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
};

export type OpenTicketMatch = {
  id: string;
  summary: string;
  status: string;
};

export type CallerContext = {
  customer: CallerSnapshot | null;
  openTickets: OpenTicketMatch[];
};

export type InsertCallInput = {
  companyId: string;
  externalId: string;
  direction: CallDirection;
  phone: string;
  durationSec: number | null;
  outcome: CallOutcome;
  recordingUrl: string | null;
  transcript: string | null;
  operatorName: string | null;
  occurredAt: Date;
  ticket: {
    id: string;
    status: string;
    summary: string;
    description: string;
    createdLabel: string;
    createdFull: string;
    updatedFull: string;
    customerId?: string | null;
    customerName?: string | null;
    customerEmail?: string | null;
    customerCompany?: string | null;
  };
  /** True solo se lo stage «Da richiamare» non è ancora tra gli stage del tenant. */
  persistCallbackStage: boolean;
};

export type UnlinkedCallInput = {
  companyId: string;
  externalId: string;
  direction: CallDirection;
  phone: string;
  durationSec: number | null;
  outcome: CallOutcome;
  recordingUrl: string | null;
  transcript: string | null;
  operatorName: string | null;
  occurredAt: Date;
};

export type InsertCallResult = {
  created: boolean;
  callId: string;
  ticketId: string | null;
  ticketStatus: string | null;
};

export type TelephonyStore = {
  findCompanyBySlug(slug: string): Promise<TelephonyCompany | null>;
  findCallByExternalId(
    companyId: string,
    externalId: string
  ): Promise<StoredCall | null>;
  findCallerContext(
    companyId: string,
    phone: string,
    terminalStatuses: string[]
  ): Promise<CallerContext>;
  insertUnlinkedCall(input: UnlinkedCallInput): Promise<InsertCallResult>;
  insertTicketAndCall(input: InsertCallInput): Promise<InsertCallResult>;
  attachCallToTicket(
    companyId: string,
    externalId: string,
    ticketId: string
  ): Promise<InsertCallResult | { error: string }>;
  createTicketForExistingCall(
    input: InsertCallInput
  ): Promise<InsertCallResult | { error: string }>;
  saveAiProposal(
    companyId: string,
    ticketId: string,
    proposal: CallProposal
  ): Promise<void>;
  applyAutoRoute(
    companyId: string,
    ticketId: string,
    currentStatus: string,
    proposal: CallProposal,
    settingsJson: unknown
  ): Promise<string | null>;
};

export type WebhookSuccess = {
  ok: true;
  idempotent: boolean;
  action: "created" | "attached" | "suggest_attach";
  callId: string;
  ticketId: string | null;
  ticketStatus: string | null;
  candidates?: OpenTicketMatch[];
  customerName?: string | null;
};

export type WebhookFailure = {
  ok: false;
  error: string;
};

export type WebhookResult = {
  status: number;
  body: WebhookSuccess | WebhookFailure;
};

export type PhoneCallRecord = {
  id: string;
  externalId: string;
  direction: CallDirection;
  phone: string;
  durationSec: number | null;
  outcome: CallOutcome;
  recordingUrl: string | null;
  transcript: string | null;
  operatorName: string | null;
  occurredAt: string;
  ticketId: string | null;
};
