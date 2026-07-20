import type { ConversationRecord } from "./conversationTypes";

// Persistenza locale conversazioni (ospite / stessa origine).
export const CONVERSATIONS_STORAGE_KEY = "aestima:conversations:v1";

function isConversationRecord(value: unknown): value is ConversationRecord {
  if (!value || typeof value !== "object") return false;
  const c = value as ConversationRecord;
  return (
    typeof c.id === "string" &&
    typeof c.customerName === "string" &&
    (c.status === "aperto" || c.status === "risolto") &&
    (c.assignee === "ai" || c.assignee === "operatore") &&
    (c.channel === "live_chat" ||
      c.channel === "embed" ||
      c.channel === "assistenza" ||
      c.channel === "inbox") &&
    Array.isArray(c.messages)
  );
}

export function loadStoredConversations(): ConversationRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const rows = parsed.filter(isConversationRecord);
    return rows.length > 0 ? rows : null;
  } catch {
    return null;
  }
}

export function saveStoredConversations(
  conversations: ConversationRecord[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CONVERSATIONS_STORAGE_KEY,
      JSON.stringify(conversations)
    );
  } catch {
    // Quota o storage disabilitato — ignora.
  }
}

export function defaultConversations(): ConversationRecord[] {
  return [];
}
