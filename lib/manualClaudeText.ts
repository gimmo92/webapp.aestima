import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import { ANTHROPIC_MODEL, getAnthropicKey } from "@/lib/anthropicKey";
import { MANUAL_MAX_BYTES } from "@/lib/manualLimits";

/** Trascrizione dei PDF dei manuali con Claude, a blocchi di pagine. Solo server. */

const MODEL = process.env.ANTHROPIC_MANUAL_MODEL?.trim() || ANTHROPIC_MODEL;
const PAGES_PER_CHUNK = 4;
const CONCURRENCY = 8;
const MAX_TOKENS = 8_000;
/** Resta sotto il maxDuration (300 s) delle route che estraggono. */
const DEADLINE_MS = 240_000;
const NO_TEXT = "NESSUN_TESTO";

export const MISSING_KEY_MESSAGE =
  "Estrazione con Claude non disponibile: chiave API Anthropic non configurata.";

const SYSTEM = `Trascrivi il testo di un manuale tecnico PDF per un archivio consultato dagli installatori.
Regole:
- Riporta solo ciò che è scritto nel documento, nella lingua originale. Non riassumere, non tradurre, non aggiungere spiegazioni.
- Non inventare coppie di serraggio, misure, codici, quantità o passaggi: se un valore non è leggibile scrivi [illeggibile].
- Mantieni titoli, elenchi e passi numerati nell'ordine del documento. Tabelle come righe di testo con " | " tra le colonne.
- Per le figure riporta solo le etichette e le didascalie scritte (codici, numeri di posizione, quote).
- Ometti intestazioni e piè di pagina ripetuti uguali su ogni pagina.
- Inizia ogni pagina con [Pagina N].
- Rispondi solo con il testo trascritto, senza premesse.
Se le pagine non contengono testo leggibile rispondi esattamente ${NO_TEXT}.`;

export type ClaudeManualText =
  | { ok: true; text: string; complete: boolean }
  | { ok: false; message: string };

type Chunk = { from: number; to: number; data: string };
type ChunkOut =
  | { ok: true; text: string; complete: boolean }
  | { ok: false; detail: string };

export async function extractPdfTextWithClaude(
  name: string,
  buffer: Buffer
): Promise<ClaudeManualText> {
  const apiKey = getAnthropicKey();
  if (!apiKey || !apiKey.startsWith("sk-ant")) {
    return { ok: false, message: MISSING_KEY_MESSAGE };
  }
  if (buffer.length > MANUAL_MAX_BYTES) {
    return { ok: false, message: `${name}: dimensione massima 12 MB.` };
  }
  if (buffer.subarray(0, 1024).indexOf("%PDF") < 0) {
    return { ok: false, message: `${name}: il file non è un PDF valido.` };
  }

  const chunks = await splitPdf(buffer);
  const client = new Anthropic({ apiKey, maxRetries: 2 });
  const deadline = Date.now() + DEADLINE_MS;
  const results: ChunkOut[] = new Array(chunks.length);
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const index = next++;
      results[index] =
        Date.now() >= deadline - 15_000
          ? { ok: false, detail: "tempo esaurito" }
          : await transcribeChunk(client, name, chunks[index], chunks.length, deadline);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker)
  );

  const failed = results.filter((r) => !r.ok) as { ok: false; detail: string }[];
  if (failed.length === results.length) {
    return {
      ok: false,
      message: `Estrazione del testo di «${name}» con Claude non riuscita (${failed[0]?.detail ?? "errore sconosciuto"}).`,
    };
  }

  const parts: string[] = [];
  let complete = true;
  results.forEach((result, index) => {
    const { from, to } = chunks[index];
    const range = from === to ? `Pagina ${from}` : `Pagine ${from}–${to}`;
    if (!result.ok) {
      complete = false;
      parts.push(`[${range}: trascrizione non riuscita (${result.detail})]`);
      return;
    }
    if (result.text) parts.push(result.text);
    if (!result.complete) {
      complete = false;
      parts.push(`[${range}: trascrizione troncata]`);
    }
  });
  const text = parts.join("\n\n").trim();
  if (!text || results.every((r) => r.ok && !r.text)) {
    return { ok: false, message: `Claude non ha trovato testo leggibile in «${name}».` };
  }
  return {
    ok: true,
    text: complete ? text : `${text}\n\n[Trascrizione incompleta: alcune pagine non sono state trascritte.]`,
    complete,
  };
}

/** Blocchi di poche pagine: un solo blocco se il PDF è corto o non si riesce a dividerlo. */
async function splitPdf(buffer: Buffer): Promise<Chunk[]> {
  const whole = (pages: number): Chunk[] => [
    { from: 1, to: Math.max(1, pages), data: buffer.toString("base64") },
  ];
  let source: PDFDocument;
  try {
    source = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });
  } catch (error) {
    console.error("split manual pdf", error);
    return whole(0);
  }
  const total = source.getPageCount();
  if (total <= PAGES_PER_CHUNK) return whole(total);

  const chunks: Chunk[] = [];
  for (let start = 0; start < total; start += PAGES_PER_CHUNK) {
    const indices = Array.from(
      { length: Math.min(PAGES_PER_CHUNK, total - start) },
      (_, i) => start + i
    );
    const part = await PDFDocument.create();
    const pages = await part.copyPages(source, indices);
    pages.forEach((page) => part.addPage(page));
    const bytes = await part.save({ useObjectStreams: true });
    chunks.push({
      from: start + 1,
      to: start + indices.length,
      data: Buffer.from(bytes).toString("base64"),
    });
  }
  return chunks;
}

async function transcribeChunk(
  client: Anthropic,
  name: string,
  chunk: Chunk,
  totalChunks: number,
  deadline: number
): Promise<ChunkOut> {
  const instruction =
    totalChunks === 1
      ? "Trascrivi il testo di questo manuale."
      : `Questo PDF contiene le pagine ${chunk.from}–${chunk.to} del manuale. Trascrivile numerando da [Pagina ${chunk.from}].`;
  try {
    const message = await client.messages
      .stream(
        {
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: SYSTEM,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "document",
                  source: {
                    type: "base64",
                    media_type: "application/pdf",
                    data: chunk.data,
                  },
                  title: name.slice(0, 180),
                },
                { type: "text", text: instruction },
              ],
            },
          ],
        },
        { timeout: Math.max(10_000, deadline - Date.now()) }
      )
      .finalMessage();

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();
    return {
      ok: true,
      text: text === NO_TEXT ? "" : text,
      complete: message.stop_reason !== "max_tokens",
    };
  } catch (err) {
    console.error("Claude manual extract", name, chunk.from, chunk.to, err);
    const detail =
      err instanceof Anthropic.APIError
        ? `Anthropic ha risposto ${err.status ?? "con un errore"}`
        : err instanceof Error && err.message
          ? err.message
          : "errore sconosciuto";
    return { ok: false, detail };
  }
}
