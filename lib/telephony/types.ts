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
  };
  /** True solo se lo stage «Da richiamare» non è ancora tra gli stage del tenant. */
  persistCallbackStage: boolean;
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
  insertTicketAndCall(input: InsertCallInput): Promise<InsertCallResult>;
};

export type WebhookSuccess = {
  ok: true;
  idempotent: boolean;
  callId: string;
  ticketId: string | null;
  ticketStatus: string | null;
};

export type WebhookFailure = {
  ok: false;
  error: string;
};

export type WebhookResult = {
  status: number;
  body: WebhookSuccess | WebhookFailure;
};
