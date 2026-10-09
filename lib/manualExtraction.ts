import { prisma } from "@/lib/prisma";
import { getAnthropicKey } from "@/lib/anthropicKey";
import { cleanManualText, extractManualText, manualExt } from "@/lib/manualText";
import {
  MISSING_KEY_MESSAGE,
  extractPdfTextWithClaude,
} from "@/lib/manualClaudeText";

/** Testo dei manuali: parser locale se basta, altrimenti Claude. Solo server. */

const MIN_LOCAL_CHARS = 400;
const RETRY_AFTER_MS = 15 * 60 * 1000;
/** Testo salvato dalla prima versione (una sola richiesta, troncata a metà manuale). */
const LEGACY_TRUNCATED = "[Trascrizione interrotta: il manuale supera il limite di estrazione.]";

export type ManualTextResult = {
  text: string;
  extracted: boolean;
  /** Motivo in italiano quando il testo di un PDF non è stato estratto. */
  error?: string;
};

export async function resolveManualText(
  name: string,
  buffer: Buffer
): Promise<ManualTextResult> {
  let local = { text: "", extracted: false };
  try {
    local = extractManualText(name, buffer);
  } catch (error) {
    console.error("extract manual", name, error);
  }
  const localText = cleanManualText(local.text);
  if (manualExt(name) !== "pdf") {
    return { text: localText, extracted: local.extracted && localText.length > 0 };
  }
  if (local.extracted && localText.length >= MIN_LOCAL_CHARS) {
    return { text: localText, extracted: true };
  }

  const claude = await extractPdfTextWithClaude(name, buffer);
  if (!claude.ok) {
    return { text: "", extracted: false, error: claude.message };
  }
  const text = cleanManualText(claude.text);
  return text
    ? { text, extracted: true }
    : { text: "", extracted: false, error: `Nessun testo estratto da «${name}».` };
}

type Gate = {
  busy: Set<string>;
  failedAt: Map<string, number>;
  errors: Map<string, string>;
};
const globalGate = globalThis as unknown as { __manualExtractGate?: Gate };
const gate: Gate = (globalGate.__manualExtractGate ??= {
  busy: new Set(),
  failedAt: new Map(),
  errors: new Map(),
});
gate.errors ??= new Map();

async function pendingManuals(companyId: string) {
  const rows = await prisma.companyManual.findMany({
    where: {
      companyId,
      OR: [
        { textExtracted: false },
        { extractedText: { contains: LEGACY_TRUNCATED } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return rows.filter((row) => manualExt(row.name) === "pdf");
}

function retryable(id: string, now: number): boolean {
  return !gate.busy.has(id) && now - (gate.failedAt.get(id) ?? 0) > RETRY_AFTER_MS;
}

export type BackfillResult = { attempted: number; done: number; errors: string[] };

/**
 * Estrae il testo dei PDF già salvati senza testo (o troncati dalla prima versione),
 * i più recenti prima. Un manuale fallito non viene ritentato per 15 minuti su questa istanza.
 */
export async function backfillManualText(
  companyId: string,
  limit = 1
): Promise<BackfillResult> {
  const result: BackfillResult = { attempted: 0, done: 0, errors: [] };
  const now = Date.now();
  const todo = (await pendingManuals(companyId))
    .filter((row) => retryable(row.id, now))
    .slice(0, limit);

  for (const row of todo) {
    gate.busy.add(row.id);
    result.attempted += 1;
    try {
      const file = await prisma.companyManual.findUnique({
        where: { id: row.id },
        select: { content: true },
      });
      if (!file) continue;
      const out = await resolveManualText(row.name, Buffer.from(file.content));
      if (!out.extracted) {
        const message = out.error ?? `Nessun testo estratto da «${row.name}».`;
        gate.failedAt.set(row.id, Date.now());
        gate.errors.set(row.id, message);
        result.errors.push(message);
        continue;
      }
      await prisma.companyManual.updateMany({
        where: { id: row.id, companyId },
        data: { extractedText: out.text, textExtracted: true },
      });
      gate.failedAt.delete(row.id);
      gate.errors.delete(row.id);
      result.done += 1;
    } catch (error) {
      console.error("backfill manual", row.name, error);
      const message = `Estrazione del testo di «${row.name}» non riuscita.`;
      gate.failedAt.set(row.id, Date.now());
      gate.errors.set(row.id, message);
      result.errors.push(message);
    } finally {
      gate.busy.delete(row.id);
    }
  }
  return result;
}

export type ManualExtractionState = {
  /** Id dei PDF il cui testo è in estrazione o in coda. */
  extractingIds: string[];
  /** Motivo in italiano per cui l'estrazione non procede. */
  warning?: string;
};

/** Stato dell'estrazione per il pannello Manuale. */
export async function manualExtractionState(
  companyId: string
): Promise<ManualExtractionState> {
  const pending = await pendingManuals(companyId);
  if (pending.length === 0) return { extractingIds: [] };
  if (!getAnthropicKey()?.startsWith("sk-ant")) {
    return { extractingIds: [], warning: MISSING_KEY_MESSAGE };
  }
  const now = Date.now();
  const errors = pending
    .map((row) => gate.errors.get(row.id))
    .filter((message): message is string => Boolean(message));
  return {
    extractingIds: pending
      .filter((row) => gate.busy.has(row.id) || retryable(row.id, now))
      .map((row) => row.id),
    warning: errors.length > 0 ? errors.join(" ") : undefined,
  };
}
