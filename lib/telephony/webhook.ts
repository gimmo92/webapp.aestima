import { createHash, timingSafeEqual } from "node:crypto";
import { newTicketId } from "@/lib/ticketData";
import { normalizeTelephonyBody, readCallChoice, readCompanySlug } from "./adapter";
import {
  isTelephonyEnabled,
  stagesFromSettings,
  ticketDraftForCall,
} from "./settings";
import type {
  CallerContext,
  InsertCallInput,
  NormalizedCallEvent,
  TelephonyStore,
  UnlinkedCallInput,
  WebhookResult,
  WebhookSuccess,
} from "./types";
import type { CallProposal } from "./classify";

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

function success(body: WebhookSuccess): WebhookResult {
  return { status: 200, body };
}

function unlinked(companyId: string, event: NormalizedCallEvent): UnlinkedCallInput {
  return {
    companyId,
    externalId: event.externalId,
    direction: event.direction,
    phone: event.phone,
    durationSec: event.durationSec,
    outcome: event.outcome,
    recordingUrl: event.recordingUrl,
    transcript: event.transcript,
    operatorName: event.operatorName,
    occurredAt: new Date(event.occurredAt),
  };
}

function customerFields(caller: CallerContext) {
  const customer = caller.customer;
  return {
    customerId: customer?.id ?? null,
    customerName: customer?.contactName || customer?.name || null,
    customerEmail: customer?.email ?? null,
    customerCompany: customer ? customer.name : null,
  };
}

export async function handleTelephonyWebhook(input: {
  secretHeader: string | null;
  expectedSecret: string | undefined;
  queryCompany: string;
  body: unknown;
  store: TelephonyStore;
  newId?: () => string;
  classify?: (
    transcript: string,
    settingsJson: unknown
  ) => Promise<CallProposal | null>;
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
  const choice = readCallChoice(input.body);
  const stages = stagesFromSettings(company.settingsJson);
  const terminal = stages.filter((stage) => stage.terminal).map((stage) => stage.id);
  const caller = await input.store.findCallerContext(
    company.id,
    event.phone,
    terminal
  );
  const suggest =
    caller.openTickets.length > 0 &&
    !choice.attachToTicketId &&
    !choice.createNew;

  const existing = await input.store.findCallByExternalId(
    company.id,
    event.externalId
  );

  if (existing?.ticketId) {
    return success({
      ok: true,
      idempotent: true,
      action: "created",
      callId: existing.id,
      ticketId: existing.ticketId,
      ticketStatus: existing.ticketStatus,
    });
  }

  if (choice.attachToTicketId) {
    if (!existing) {
      await input.store.insertUnlinkedCall(unlinked(company.id, event));
    }
    const linked = await input.store.attachCallToTicket(
      company.id,
      event.externalId,
      choice.attachToTicketId
    );
    if ("error" in linked) return fail(400, linked.error);
    return success({
      ok: true,
      idempotent: false,
      action: "attached",
      callId: linked.callId,
      ticketId: linked.ticketId,
      ticketStatus: linked.ticketStatus,
    });
  }

  if (suggest) {
    const parked = existing
      ? {
          created: false,
          callId: existing.id,
        }
      : await input.store.insertUnlinkedCall(unlinked(company.id, event));
    return success({
      ok: true,
      idempotent: !parked.created,
      action: "suggest_attach",
      callId: parked.callId,
      ticketId: null,
      ticketStatus: null,
      candidates: caller.openTickets,
      customerName: caller.customer?.name ?? null,
    });
  }

  const draft = ticketDraftForCall(event, stages);
  const labels = timeLabels(event.occurredAt);
  const ticketInput: InsertCallInput = {
    ...unlinked(company.id, event),
    persistCallbackStage: draft.persistCallbackStage,
    ticket: {
      id: (input.newId ?? newTicketId)(),
      status: draft.status,
      summary: draft.summary,
      description: draft.description,
      ...labels,
      ...customerFields(caller),
    },
  };

  const inserted = existing
    ? await input.store.createTicketForExistingCall(ticketInput)
    : await input.store.insertTicketAndCall(ticketInput);
  if ("error" in inserted) return fail(400, inserted.error);

  if (
    inserted.created &&
    inserted.ticketId &&
    event.transcript?.trim() &&
    input.classify
  ) {
    try {
      const proposal = await input.classify(
        event.transcript,
        company.settingsJson
      );
      if (proposal) {
        await input.store.saveAiProposal(
          company.id,
          inserted.ticketId,
          proposal
        );
        const routed = await input.store.applyAutoRoute(
          company.id,
          inserted.ticketId,
          inserted.ticketStatus ?? "aperto",
          proposal,
          company.settingsJson
        );
        if (routed) {
          return success({
            ok: true,
            idempotent: !inserted.created,
            action: "created",
            callId: inserted.callId,
            ticketId: inserted.ticketId,
            ticketStatus: routed,
          });
        }
      }
    } catch (err) {
      console.error("Classificazione chiamata fallita:", err);
    }
  }

  return success({
    ok: true,
    idempotent: !inserted.created,
    action: "created",
    callId: inserted.callId,
    ticketId: inserted.ticketId,
    ticketStatus: inserted.ticketStatus,
  });
}
