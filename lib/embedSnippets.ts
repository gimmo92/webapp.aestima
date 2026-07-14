export type EmbedMode = "bubble" | "wide";

export const EMBED_MODE_LABELS: Record<EmbedMode, string> = {
  bubble: "Bolla floating",
  wide: "Chatbox larga",
};

export function buildEmbedSnippet(baseUrl: string, mode: EmbedMode): string {
  if (mode === "bubble") {
    return `<script
  src="${baseUrl}/embed.js"
  data-mode="bubble"
  data-base-url="${baseUrl}"
  async
></script>`;
  }
  return `<div id="aestima-chat-wide"></div>
<script
  src="${baseUrl}/embed.js"
  data-mode="wide"
  data-base-url="${baseUrl}"
  data-container="aestima-chat-wide"
  data-height="640"
  async
></script>`;
}
