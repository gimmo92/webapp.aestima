import Anthropic from "@anthropic-ai/sdk";

// Lettura della API key Anthropic dalle env var, tollerante sul nome.
// Su Vercel la chiave può essere stata salvata come ANTHROPIC_API_KEY
// (standard) oppure con un nome più semplice come "anthropic".
// La chiave NON è mai hardcodata: viene solo letta dall'ambiente.

const NAMED_KEY_CANDIDATES = [
  "ANTHROPIC_API_KEY",
  "anthropic",
  "ANTHROPIC",
  "ANTHROPIC_KEY",
  "CLAUDE_API_KEY",
] as const;

function normalizeKey(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim().replace(/^["']|["']$/g, "");
  // Rimuove caratteri non ASCII (copy/paste da dashboard, BOM, newline nascosti).
  const cleaned = trimmed.replace(/[^\x20-\x7E]/g, "");
  return cleaned || undefined;
}

export function getAnthropicKey(): string | undefined {
  for (const name of NAMED_KEY_CANDIDATES) {
    const key = normalizeKey(process.env[name]);
    if (key) return key;
  }

  // Ultima risorsa: qualsiasi env var il cui nome contiene "anthropic" o "claude".
  for (const [name, value] of Object.entries(process.env)) {
    if (!/anthropic|claude/i.test(name)) continue;
    const key = normalizeKey(value);
    if (key?.startsWith("sk-ant")) return key;
  }

  return undefined;
}

/** Modello Claude usato (configurabile via env). */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-6";

export type AnthropicCallResult =
  | { ok: true; text: string }
  | { ok: false; status?: number; message: string };

function formatError(err: unknown): string {
  if (err instanceof Anthropic.APIError) {
    return `Anthropic ha risposto ${err.status}.`;
  }
  if (err instanceof Error) {
    return err.message || "Errore sconosciuto verso Anthropic.";
  }
  return "Errore sconosciuto verso Anthropic.";
}

export type AnthropicChatTurn = {
  role: "user" | "assistant";
  content: string;
};

/** Chiamata multi-turno all'API Messages (cronologia completa, stateless). */
export async function callAnthropicConversation(params: {
  system: string;
  messages: AnthropicChatTurn[];
  maxTokens?: number;
}): Promise<AnthropicCallResult> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return { ok: false, message: "Chiave API Anthropic non configurata." };
  }

  if (!apiKey.startsWith("sk-ant")) {
    return {
      ok: false,
      message:
        "Chiave API non valida: deve iniziare con sk-ant-. Controlla il valore su Vercel.",
    };
  }

  if (params.messages.length === 0) {
    return { ok: false, message: "Cronologia conversazione vuota." };
  }

  try {
    const client = new Anthropic({
      apiKey,
      maxRetries: 2,
    });

    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: params.maxTokens ?? 1536,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) {
      return { ok: false, message: "Risposta Anthropic vuota." };
    }

    return { ok: true, text };
  } catch (err) {
    console.error("Anthropic API error:", err);
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    return { ok: false, status, message: formatError(err) };
  }
}

/** Chiamata condivisa all'API Messages di Anthropic (solo server-side). */
export async function callAnthropicMessages(params: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<AnthropicCallResult> {
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return { ok: false, message: "Chiave API Anthropic non configurata." };
  }

  if (!apiKey.startsWith("sk-ant")) {
    return {
      ok: false,
      message:
        "Chiave API non valida: deve iniziare con sk-ant-. Controlla il valore su Vercel.",
    };
  }

  try {
    const client = new Anthropic({
      apiKey,
      maxRetries: 2,
    });

    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: params.maxTokens ?? 1024,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    });

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    if (!text.trim()) {
      return { ok: false, message: "Risposta Anthropic vuota." };
    }

    return { ok: true, text };
  } catch (err) {
    console.error("Anthropic API error:", err);
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    return { ok: false, status, message: formatError(err) };
  }
}
