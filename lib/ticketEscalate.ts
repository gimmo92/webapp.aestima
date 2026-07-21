import type { ConversationRecord } from "./conversationTypes";
import type { DisplayMessage } from "./serviceChatTypes";
import type { TicketCategory, TicketPriority } from "./ticketTypes";

/** L'utente chiede esplicitamente un tecnico / ticket / operatore. */
export function isHumanEscalationIntent(text: string): boolean {
  return /parla con (un )?(tecnico|operatore|umano)|voglio (un )?(tecnico|operatore)|apri(re)? (un )?ticket|escalat|aiuto umano|non (mi )?risolve|passa (a |all')operatore|contatta(re)? (un )?tecnico/i.test(
    text
  );
}

/** La risposta AI ammette di non aver risolto / invita l'operatore. */
export function isAiUnresolved(text: string): boolean {
  return /non (ho )?trovat|nessun(a|o) corrispondenz|un operatore seguirà|invita.*operatore|non riesco a (risolvere|individuare)/i.test(
    text
  );
}

export function inferTicketCategory(
  messages: Array<{ content: string }>
): TicketCategory {
  const hay = messages.map((m) => m.content).join(" ").toLowerCase();
  if (/ricambio|codice|distinta|pezzo|guarnizione|cuscinetto|listino/.test(hay)) {
    return "ricambio";
  }
  if (
    /guasto|malfunzion|errore|allarme|rumore|vibraz|non parte|blocc|ferma/.test(
      hay
    )
  ) {
    return "troubleshooting";
  }
  return "altro";
}

export function inferTicketPriority(
  messages: Array<{ content: string }>
): TicketPriority {
  const hay = messages.map((m) => m.content).join(" ").toLowerCase();
  if (/urgent|produzione ferma|ferma la linea|bloccata|asap|immediat/.test(hay)) {
    return "alta";
  }
  return "normale";
}

export function buildTicketSummary(
  messages: Array<{ role: string; content: string }>,
  conv?: Pick<ConversationRecord, "machineModel" | "machineSerial" | "customerName">
): string {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);
  const lastUser = userTexts[userTexts.length - 1] ?? "Richiesta assistenza";
  const machine =
    conv?.machineSerial || conv?.machineModel
      ? ` · ${[conv.machineModel, conv.machineSerial].filter(Boolean).join(" ")}`
      : "";
  const short =
    lastUser.length > 90 ? `${lastUser.slice(0, 87).trim()}…` : lastUser;
  return `${short}${machine}`;
}

export function buildTicketDescription(
  messages: Array<{ role: string; content: string }>,
  reason: string
): string {
  const lines = [
    `Motivo escalation: ${reason}`,
    "",
    "— Cronologia chat —",
    ...messages
      .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "agent")
      .slice(-12)
      .map((m) => {
        const who =
          m.role === "user"
            ? "Cliente"
            : m.role === "agent"
              ? "Operatore"
              : "AI";
        return `[${who}] ${m.content}`;
      }),
  ];
  return lines.join("\n");
}

/** Estrae modello/matricola da messaggi utente se presenti. */
export function extractMachineFromMessages(
  messages: Array<{ content: string }>
): { machineModel?: string; machineSerial?: string } {
  const hay = messages.map((m) => m.content).join("\n");
  const serialMatch = hay.match(
    /matricola\s+([A-Z0-9][A-Z0-9-]{3,})|serial(?:e)?\s*[:=]?\s*([A-Z0-9][A-Z0-9-]{3,})/i
  );
  const serial = serialMatch?.[1] ?? serialMatch?.[2];
  const modelMatch = hay.match(
    /\b([A-Z]{2,5}[-_]?\d{3,5}[A-Z]?)\b|(?:modello|macchina)\s+([A-Za-z0-9][A-Za-z0-9 .-]{2,40})/i
  );
  const model = modelMatch?.[1] ?? modelMatch?.[2]?.trim();
  return {
    machineSerial: serial?.toUpperCase(),
    machineModel: model,
  };
}

export function escalateQuickReplyOption() {
  return {
    label: "Apri ticket tecnico",
    value: "Vorrei parlare con un tecnico — apri un ticket",
  };
}
