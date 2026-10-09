import { prisma } from "@/lib/prisma";
import { cleanManualText, extractManualText, manualExt } from "@/lib/manualText";
import { extractPdfTextWithClaude } from "@/lib/manualClaudeText";

/** Testo dei manuali: parser locale se basta, altrimenti Claude. Solo server. */

const MIN_LOCAL_CHARS = 400;
const RETRY_AFTER_MS = 15 * 60 * 1000;

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
  const note = claude.truncated
    ? "\n\n[Trascrizione interrotta: il manuale supera il limite di estrazione.]"
    : "";
  const text = cleanManualText(claude.text + note);
  return text
    ? { text, extracted: true }
    : { text: "", extracted: false, error: `Nessun testo estratto da «${name}».` };
}

type Gate = { busy: Set<string>; failedAt: Map<string, number> };
const globalGate = globalThis as unknown as { __manualExtractGate?: Gate };
const gate: Gate = (globalGate.__manualExtractGate ??= {
  busy: new Set(),
  failedAt: new Map(),
});

export type BackfillResult = { attempted: number; done: number; errors: string[] };

/**
 * Estrae il testo dei PDF già salvati senza testo (i più recenti prima).
 * Un manuale fallito non viene ritentato per 15 minuti su questa istanza.
 */
export async function backfillManualText(
  companyId: string,
  limit = 1
): Promise<BackfillResult> {
  const result: BackfillResult = { attempted: 0, done: 0, errors: [] };
  const pending = await prisma.companyManual.findMany({
    where: { companyId, textExtracted: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  const now = Date.now();
  const todo = pending
    .filter((row) => manualExt(row.name) === "pdf")
    .filter((row) => !gate.busy.has(row.id))
    .filter((row) => now - (gate.failedAt.get(row.id) ?? 0) > RETRY_AFTER_MS)
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
        gate.failedAt.set(row.id, Date.now());
        result.errors.push(out.error ?? `Nessun testo estratto da «${row.name}».`);
        continue;
      }
      await prisma.companyManual.updateMany({
        where: { id: row.id, companyId },
        data: { extractedText: out.text, textExtracted: true },
      });
      gate.failedAt.delete(row.id);
      result.done += 1;
    } catch (error) {
      console.error("backfill manual", row.name, error);
      gate.failedAt.set(row.id, Date.now());
      result.errors.push(`Estrazione del testo di «${row.name}» non riuscita.`);
    } finally {
      gate.busy.delete(row.id);
    }
  }
  return result;
}
