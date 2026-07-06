// Lettura della API key Anthropic dalle env var, tollerante sul nome.
// Su Vercel la chiave può essere stata salvata come ANTHROPIC_API_KEY
// (standard) oppure con un nome più semplice come "anthropic".
// La chiave NON è mai hardcodata: viene solo letta dall'ambiente.

export function getAnthropicKey(): string | undefined {
  return (
    process.env.ANTHROPIC_API_KEY ||
    process.env.anthropic ||
    process.env.ANTHROPIC ||
    undefined
  );
}

/** Modello Claude usato (configurabile via env, default recente). */
export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
