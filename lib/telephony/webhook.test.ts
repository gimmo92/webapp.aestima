import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fromAircallPayload } from "./adapter";
import { CALLBACK_STAGE_ID } from "./settings";
import type {
  InsertCallInput,
  InsertCallResult,
  StoredCall,
  TelephonyCompany,
  TelephonyStore,
} from "./types";
import { handleTelephonyWebhook } from "./webhook";

const SECRET = "demo-secret";

function company(settingsJson: unknown): TelephonyCompany {
  return { id: "co-1", slug: "altaquota", settingsJson };
}

function memoryStore(initial: TelephonyCompany): TelephonyStore & {
  tickets: InsertCallInput[];
  calls: StoredCall[];
} {
  const tickets: InsertCallInput[] = [];
  const calls: StoredCall[] = [];
  return {
    tickets,
    calls,
    async findCompanyBySlug(slug) {
      return slug === initial.slug ? initial : null;
    },
    async findCallByExternalId(_companyId, externalId) {
      return calls.find((call) => call.externalId === externalId) ?? null;
    },
    async insertTicketAndCall(input): Promise<InsertCallResult> {
      const existing = calls.find((call) => call.externalId === input.externalId);
      if (existing) {
        return {
          created: false,
          callId: existing.id,
          ticketId: existing.ticketId,
          ticketStatus: existing.ticketStatus,
        };
      }
      const callId = `ph-${calls.length + 1}`;
      calls.push({
        id: callId,
        externalId: input.externalId,
        ticketId: input.ticket.id,
        ticketStatus: input.ticket.status,
      });
      tickets.push(input);
      if (input.persistCallbackStage) {
        const prev =
          initial.settingsJson &&
          typeof initial.settingsJson === "object" &&
          !Array.isArray(initial.settingsJson)
            ? { ...(initial.settingsJson as Record<string, unknown>) }
            : {};
        const stages = Array.isArray(prev.ticketStages) ? [...prev.ticketStages] : [];
        stages.push({ id: CALLBACK_STAGE_ID, label: "Da richiamare" });
        initial.settingsJson = { ...prev, ticketStages: stages };
      }
      return {
        created: true,
        callId,
        ticketId: input.ticket.id,
        ticketStatus: input.ticket.status,
      };
    },
  };
}

function internalBody(outcome: "answered" | "missed" | "voicemail", externalId = "call-1") {
  return {
    companySlug: "altaquota",
    provider: "internal",
    call: {
      externalId,
      direction: "inbound",
      phone: "+39 333 1112233",
      durationSec: outcome === "answered" ? 95 : 0,
      outcome,
      recordingUrl: null,
      transcript: outcome === "voicemail" ? "Richiamatemi per il parapetto." : null,
      operatorName: "Giulia",
      occurredAt: "2026-10-04T09:15:00.000Z",
    },
  };
}

async function post(
  store: TelephonyStore,
  body: unknown,
  secret: string | null = SECRET
) {
  return handleTelephonyWebhook({
    secretHeader: secret,
    expectedSecret: SECRET,
    queryCompany: "",
    body,
    store,
    newId: () => "SRV-1001",
  });
}

describe("webhook telefonia", () => {
  it("crea un ticket Da richiamare per la chiamata persa e non lo duplica", async () => {
    const store = memoryStore(
      company({ features: { telephony: true } })
    );
    const first = await post(store, internalBody("missed"));
    assert.equal(first.status, 200);
    assert.equal(first.body.ok, true);
    if (!first.body.ok) return;
    assert.equal(first.body.idempotent, false);
    assert.equal(first.body.ticketId, "SRV-1001");
    assert.equal(first.body.ticketStatus, CALLBACK_STAGE_ID);
    assert.equal(store.tickets.length, 1);
    assert.equal(store.tickets[0]?.ticket.summary, "Da richiamare · +39 333 1112233");
    assert.equal(store.tickets[0]?.ticket.status, CALLBACK_STAGE_ID);
    assert.equal(store.tickets[0]?.persistCallbackStage, true);

    const second = await post(store, internalBody("missed"));
    assert.equal(second.status, 200);
    assert.equal(second.body.ok, true);
    if (!second.body.ok) return;
    assert.equal(second.body.idempotent, true);
    assert.equal(second.body.ticketId, "SRV-1001");
    assert.equal(second.body.callId, first.body.callId);
    assert.equal(store.tickets.length, 1);
    assert.equal(store.calls.length, 1);
  });

  it("tratta la segreteria come ticket Da richiamare", async () => {
    const store = memoryStore(company({ features: { telephony: true } }));
    const result = await post(store, internalBody("voicemail", "vm-9"));
    assert.equal(result.status, 200);
    assert.equal(store.tickets[0]?.ticket.status, CALLBACK_STAGE_ID);
    assert.match(store.tickets[0]?.ticket.description ?? "", /segreteria/);
  });

  it("rifiuta il replay con segreto errato senza scrivere", async () => {
    const store = memoryStore(company({ features: { telephony: true } }));
    const result = await post(store, internalBody("missed"), "sbagliato");
    assert.equal(result.status, 401);
    assert.equal(store.tickets.length, 0);
  });

  it("non crea ticket se il flag telephony è spento", async () => {
    const store = memoryStore(company({ features: { telephony: false } }));
    const result = await post(store, internalBody("missed"));
    assert.equal(result.status, 403);
    assert.equal(store.tickets.length, 0);
  });
});

describe("adapter Aircall", () => {
  it("mappa una chiamata persa sul formato interno", () => {
    const result = fromAircallPayload({
      event: "call.ended",
      data: {
        id: 4812,
        direction: "inbound",
        raw_digits: "+39 347 5556677",
        duration: 12,
        missed_call_reason: "no_answer",
        answered_at: null,
        ended_at: 1_759_000_000,
        recording: null,
        user: { name: "Marco" },
      },
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.event.externalId, "4812");
    assert.equal(result.event.outcome, "missed");
    assert.equal(result.event.phone, "+39 347 5556677");
    assert.equal(result.event.operatorName, "Marco");
    assert.equal(result.event.direction, "inbound");
  });
});
