export type EmbedMode = "bubble" | "wide";

export const EMBED_MODE_LABELS: Record<EmbedMode, string> = {
  bubble: "Bolla floating",
  wide: "Chatbox larga",
};

export function buildTicketFormIframeSnippet(
  baseUrl: string,
  companySlug: string
): string {
  return `<iframe
  src="${baseUrl}/embed/ticket?company=${encodeURIComponent(companySlug)}"
  title="Apri un ticket"
  style="width:100%;min-height:820px;border:0;border-radius:16px;"
></iframe>`;
}

export function buildTicketFormScriptSnippet(
  baseUrl: string,
  companySlug: string
): string {
  return `<div id="aftercore-ticket-form"></div>
<script
  src="${baseUrl}/embed.js"
  data-mode="ticket"
  data-base-url="${baseUrl}"
  data-company="${companySlug}"
  data-container="aftercore-ticket-form"
  data-height="820"
  async
></script>`;
}

export function buildEmbedSnippet(baseUrl: string, mode: EmbedMode): string {
  if (mode === "bubble") {
    return `<script
  src="${baseUrl}/embed.js"
  data-mode="bubble"
  data-base-url="${baseUrl}"
  async
></script>`;
  }
  return `<div id="aftercore-chat-wide"></div>
<script
  src="${baseUrl}/embed.js"
  data-mode="wide"
  data-base-url="${baseUrl}"
  data-container="aftercore-chat-wide"
  data-height="640"
  async
></script>`;
}
