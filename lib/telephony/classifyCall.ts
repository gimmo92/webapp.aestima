import { callAnthropicMessages } from "@/lib/anthropicKey";
import {
  CLASSIFY_TIMEOUT_MS,
  parseClassification,
  routingFromSettings,
  withDepartment,
} from "@/lib/telephony/classify";
import type { CallProposal } from "@/lib/telephony/classify";

const CLASSIFY_SYSTEM = `Sei l'addetto che smista le chiamate di post-vendita di un produttore di sistemi anticaduta (linee vita, scale, parapetti).
Leggi la trascrizione e rispondi SOLO con un oggetto JSON, senza markdown.
Schema:
{
  "category": "supporto_montaggio" | "manuale" | "pezzo_mancante" | "integrazione_ordine" | "ricambio" | "reso" | "altro",
  "urgency": "normale" | "alta",
  "summary": "riepilogo in due righe",
  "product": "prodotto citato oppure null",
  "orderNumber": "numero ordine o commessa oppure null",
  "partCodes": ["codici pezzo citati"],
  "suggestedAction": "prossima azione concreta",
  "confidence": 0.0
}
confidence è tra 0 e 1. urgency è alta solo se il cantiere è fermo o il cliente insiste sui tempi.`;

export async function classifyTranscript(
  transcript: string,
  settingsJson: unknown
): Promise<CallProposal | null> {
  const text = transcript.trim();
  if (!text) return null;
  try {
    const llm = await Promise.race([
      callAnthropicMessages({
        system: CLASSIFY_SYSTEM,
        user: text.slice(0, 12000),
        maxTokens: 700,
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), CLASSIFY_TIMEOUT_MS);
      }),
    ]);
    if (!llm?.ok) return null;
    const parsed = parseClassification(llm.text);
    if (!parsed) return null;
    return withDepartment(parsed, routingFromSettings(settingsJson));
  } catch (err) {
    console.error("Classificazione chiamata fallita:", err);
    return null;
  }
}
