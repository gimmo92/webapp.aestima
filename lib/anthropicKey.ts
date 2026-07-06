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
  const trimmed = value?.trim();
  return trimmed || undefined;
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

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: params.maxTokens ?? 1024,
        system: params.system,
        messages: [{ role: "user", content: params.user }],
      }),
    });

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 240);
      console.error("Anthropic API error:", res.status, detail);
      return {
        ok: false,
        status: res.status,
        message: `Anthropic ha risposto ${res.status}.`,
      };
    }

    const data = await res.json();
    const text: string =
      data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    if (!text.trim()) {
      return { ok: false, message: "Risposta Anthropic vuota." };
    }
    return { ok: true, text };
  } catch (err) {
    console.error("Anthropic fetch error:", err);
    return { ok: false, message: "Errore di rete verso Anthropic." };
  }
}
