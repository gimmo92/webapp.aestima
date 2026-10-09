import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL, getAnthropicKey } from "@/lib/anthropicKey";
import { MANUAL_MAX_BYTES } from "@/lib/manualLimits";

/** Trascrizione dei PDF dei manuali con Claude (documento base64). Solo server. */

const MODEL = process.env.ANTHROPIC_MANUAL_MODEL?.trim() || ANTHROPIC_MODEL;
const MAX_TOKENS = 12_000;
const NO_TEXT = "NESSUN_TESTO";

const SYSTEM = `Trascrivi il testo di un manuale tecnico PDF per un archivio consultato dagli installatori.
Regole:
- Riporta solo ciò che è scritto nel documento, nella lingua originale. Non riassumere, non tradurre, non aggiungere spiegazioni.
- Non inventare coppie di serraggio, misure, codici, quantità o passaggi: se un valore non è leggibile scrivi [illeggibile].
- Mantieni titoli, elenchi e passi numerati nell'ordine del documento. Tabelle come righe di testo con " | " tra le colonne.
- Per le figure riporta solo le etichette e le didascalie scritte (codici, numeri di posizione, quote).
- Ometti intestazioni e piè di pagina ripetuti uguali su ogni pagina.
- Inizia ogni pagina con [Pagina N].
- Rispondi solo con il testo trascritto, senza premesse.
Se il documento non contiene testo leggibile rispondi esattamente ${NO_TEXT}.`;

export type ClaudeManualText =
  | { ok: true; text: string; truncated: boolean }
  | { ok: false; message: string };

export async function extractPdfTextWithClaude(
  name: string,
  buffer: Buffer
): Promise<ClaudeManualText> {
  const apiKey = getAnthropicKey();
  if (!apiKey || !apiKey.startsWith("sk-ant")) {
    return {
      ok: false,
      message:
        "Estrazione con Claude non disponibile: chiave API Anthropic non configurata.",
    };
  }
  if (buffer.length > MANUAL_MAX_BYTES) {
    return { ok: false, message: `${name}: dimensione massima 12 MB.` };
  }
  if (buffer.subarray(0, 1024).indexOf("%PDF") < 0) {
    return { ok: false, message: `${name}: il file non è un PDF valido.` };
  }

  try {
    const client = new Anthropic({ apiKey, maxRetries: 1, timeout: 280_000 });
    const message = await client.messages
      .stream({
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
                  data: buffer.toString("base64"),
                },
                title: name.slice(0, 180),
              },
              { type: "text", text: "Trascrivi il testo di questo manuale." },
            ],
          },
        ],
      })
      .finalMessage();

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!text || text === NO_TEXT) {
      return {
        ok: false,
        message: `Claude non ha trovato testo leggibile in «${name}».`,
      };
    }
    return { ok: true, text, truncated: message.stop_reason === "max_tokens" };
  } catch (err) {
    console.error("Claude manual extract", name, err);
    const detail =
      err instanceof Anthropic.APIError
        ? `Anthropic ha risposto ${err.status ?? "con un errore"}`
        : err instanceof Error && err.message
          ? err.message
          : "errore sconosciuto";
    return {
      ok: false,
      message: `Estrazione del testo di «${name}» con Claude non riuscita (${detail}).`,
    };
  }
}
