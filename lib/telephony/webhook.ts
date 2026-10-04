import { createHash, timingSafeEqual } from "node:crypto";
import { newTicketId } from "@/lib/ticketData";
import { normalizeTelephonyBody, readCompanySlug } from "./adapter";
import {
  isTelephonyEnabled,
  stagesFromSettings,
  ticketDraftForCall,
} from "./settings";
import type { TelephonyStore, WebhookResult } from "./types";

function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

function fail(status: number, error: string): WebhookResult {
  return { status, body: { ok: false, error } };
}

function timeLabels(iso: string): {
  createdLabel: string;
  createdFull: string;
  updatedFull: string;
} {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const stamp = `${hh}:${mm}`;
  return {
    createdLabel: stamp,
    createdFull: date.toLocaleString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    updatedFull: stamp,
  };
}

export async function handleTelephonyWebhook(input: {
  secretHeader: string | null;
  expectedSecret: string | undefined;
  queryCompany: string;
  body: unknown;
  store: TelephonyStore;
  newId?: () => string;
}): Promise<WebhookResult> {
  const expected = input.expectedSecret?.trim() ?? "";
  if (!expected) {
    return fail(503, "TELEPHONY_WEBHOOK_SECRET non configurato.");
  }
  const provided = input.secretHeader?.trim() ?? "";
  if (!provided || !secretsMatch(provided, expected)) {
    return fail(401, "Segreto webhook non valido.");
  }

  const companySlug = readCompanySlug(input.body, input.queryCompany);
  if (!companySlug) return fail(400, "Company mancante.");

  const normalized = normalizeTelephonyBody(input.body);
  if (!normalized.ok) return fail(400, normalized.error);

  const company = await input.store.findCompanyBySlug(companySlug);
  if (!company) return fail(404, "Azienda non trovata.");
  if (!isTelephonyEnabled(company.settingsJson)) {
    return fail(403, "Telefonia non attiva per questa azienda.");
  }

  const event = normalized.event;
  const existing = await input.store.findCallByExternalId(
    company.id,
    event.externalId
  );
  if (existing) {
    return {
      status: 200,
      body: {
        ok: true,
        idempotent: true,
        callId: existing.id,
        ticketId: existing.ticketId,
        ticketStatus: existing.ticketStatus,
      },
    };
  }

  const stages = stagesFromSettings(company.settingsJson);
  const draft = ticketDraftForCall(event, stages);
  const labels = timeLabels(event.occurredAt);
  const inserted = await input.store.insertTicketAndCall({
    companyId: company.id,
    externalId: event.externalId,
    direction: event.direction,
    phone: event.phone,
    durationSec: event.durationSec,
    outcome: event.outcome,
    recordingUrl: event.recordingUrl,
    transcript: event.transcript,
    operatorName: event.operatorName,
    occurredAt: new Date(event.occurredAt),
    persistCallbackStage: draft.persistCallbackStage,
    ticket: {
      id: (input.newId ?? newTicketId)(),
      status: draft.status,
      summary: draft.summary,
      description: draft.description,
      ...labels,
    },
  });

  return {
    status: 200,
    body: {
      ok: true,
      idempotent: !inserted.created,
      callId: inserted.callId,
      ticketId: inserted.ticketId,
      ticketStatus: inserted.ticketStatus,
    },
  };
}
