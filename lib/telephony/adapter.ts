import type {
  CallDirection,
  CallOutcome,
  NormalizedCallEvent,
} from "./types";

export type AdapterResult =
  | { ok: true; event: NormalizedCallEvent }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalString(value: unknown, max: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function requireEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): T | { error: string } {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    return { error: `${label} non valido.` };
  }
  return value as T;
}

const DIRECTIONS = ["inbound", "outbound"] as const;
const OUTCOMES = ["answered", "missed", "voicemail"] as const;

/** Formato interno usato dal simulatore e dai test. */
export function fromInternalCall(call: unknown): AdapterResult {
  if (!isRecord(call)) {
    return { ok: false, error: "Chiamata interna mancante." };
  }
  const externalId = optionalString(call.externalId, 128);
  if (!externalId) return { ok: false, error: "Id chiamata esterno mancante." };

  const direction = requireEnum<CallDirection>(
    call.direction,
    DIRECTIONS,
    "Direzione"
  );
  if (typeof direction !== "string") return { ok: false, error: direction.error };

  const phone = optionalString(call.phone, 40);
  if (!phone) return { ok: false, error: "Numero mancante." };

  const outcome = requireEnum<CallOutcome>(call.outcome, OUTCOMES, "Esito");
  if (typeof outcome !== "string") return { ok: false, error: outcome.error };

  let durationSec: number | null = null;
  if (call.durationSec != null) {
    if (
      typeof call.durationSec !== "number" ||
      !Number.isInteger(call.durationSec) ||
      call.durationSec < 0
    ) {
      return { ok: false, error: "Durata non valida." };
    }
    durationSec = call.durationSec;
  }

  if (typeof call.occurredAt !== "string" || Number.isNaN(Date.parse(call.occurredAt))) {
    return { ok: false, error: "Timestamp chiamata non valido." };
  }

  return {
    ok: true,
    event: {
      externalId,
      direction,
      phone,
      durationSec,
      outcome,
      recordingUrl: optionalString(call.recordingUrl, 2000),
      transcript: optionalString(call.transcript, 20000),
      operatorName: optionalString(call.operatorName, 120),
      occurredAt: new Date(call.occurredAt).toISOString(),
    },
  };
}

/**
 * Mappa il payload pubblico di Aircall `call.ended` sull'evento interno.
 * La logica di ticket non conosce questi campi.
 */
export function fromAircallPayload(body: unknown): AdapterResult {
  if (!isRecord(body)) {
    return { ok: false, error: "Payload Aircall non valido." };
  }
  const data = isRecord(body.data) ? body.data : body;
  const id = data.id;
  if (id == null || (typeof id !== "string" && typeof id !== "number")) {
    return { ok: false, error: "Id chiamata Aircall mancante." };
  }
  const externalId = String(id).trim().slice(0, 128);
  if (!externalId) return { ok: false, error: "Id chiamata Aircall mancante." };

  const direction = requireEnum<CallDirection>(
    data.direction,
    DIRECTIONS,
    "Direzione"
  );
  if (typeof direction !== "string") return { ok: false, error: direction.error };

  const phone = optionalString(data.raw_digits, 40);
  if (!phone) return { ok: false, error: "Numero Aircall mancante." };

  const hasVoicemail = data.voicemail != null && data.voicemail !== "";
  const missed =
    (typeof data.missed_call_reason === "string" &&
      data.missed_call_reason.trim() !== "") ||
    data.answered_at == null;
  const outcome: CallOutcome = hasVoicemail
    ? "voicemail"
    : missed
      ? "missed"
      : "answered";

  let durationSec: number | null = null;
  if (typeof data.duration === "number" && Number.isFinite(data.duration)) {
    durationSec = Math.max(0, Math.round(data.duration));
  }

  const endedAt =
    typeof data.ended_at === "number" && Number.isFinite(data.ended_at)
      ? new Date(data.ended_at * 1000).toISOString()
      : new Date().toISOString();

  const user = isRecord(data.user) ? data.user : null;
  const recording =
    typeof data.recording === "string" ? data.recording : null;

  return fromInternalCall({
    externalId,
    direction,
    phone,
    durationSec,
    outcome,
    recordingUrl: recording,
    transcript: typeof data.transcript === "string" ? data.transcript : null,
    operatorName: user && typeof user.name === "string" ? user.name : null,
    occurredAt: endedAt,
  });
}

export function normalizeTelephonyBody(body: unknown): AdapterResult {
  if (!isRecord(body)) {
    return { ok: false, error: "JSON non valido." };
  }
  const provider = body.provider;
  if (provider == null || provider === "internal") {
    return fromInternalCall(body.call);
  }
  if (provider === "aircall") {
    return fromAircallPayload(body.payload ?? body);
  }
  return { ok: false, error: "Provider telefonia sconosciuto." };
}

export function readCompanySlug(body: unknown, querySlug: string): string {
  const fromQuery = querySlug.trim();
  if (fromQuery) return fromQuery;
  if (!isRecord(body) || typeof body.companySlug !== "string") return "";
  return body.companySlug.trim();
}
