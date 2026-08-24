import type { ConversationRecord } from "./conversationTypes";

// Persistenza locale conversazioni (ospite / stessa origine).
export const CONVERSATIONS_STORAGE_KEY = "aftercore:conversations:v1";
const DELETED_STORAGE_KEY = "aftercore:conversations:deleted:v1";

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

function loadDeletedIdSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(DELETED_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function saveDeletedIdSet(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      DELETED_STORAGE_KEY,
      JSON.stringify([...ids])
    );
  } catch {
    /* ignore */
  }
}

export function markConversationDeleted(id: string) {
  const ids = loadDeletedIdSet();
  ids.add(id);
  saveDeletedIdSet(ids);
}

export function isConversationDeleted(id: string) {
  return loadDeletedIdSet().has(id);
}

export function loadDeletedConversationIds(): string[] {
  return [...loadDeletedIdSet()];
}

export function conversationUpdatedAtMs(c: ConversationRecord): number {
  if (c.updatedAt) {
    const t = Date.parse(c.updatedAt);
    if (Number.isFinite(t)) return t;
  }
  const last = c.messages[c.messages.length - 1];
  const fromId = last?.id?.match(/^msg-(\d{10,})/);
  if (fromId) return Number(fromId[1]);
  return 0;
}

/** Più recenti in cima. */
export function sortConversations(
  conversations: ConversationRecord[]
): ConversationRecord[] {
  return [...conversations].sort((a, b) => {
    const diff = conversationUpdatedAtMs(b) - conversationUpdatedAtMs(a);
    if (diff !== 0) return diff;
    return b.id.localeCompare(a.id);
  });
}

export function excludeDeletedConversations(
  conversations: ConversationRecord[]
): ConversationRecord[] {
  const deleted = loadDeletedIdSet();
  if (deleted.size === 0) return conversations;
  return conversations.filter((c) => !deleted.has(c.id));
}

/** Unisce le conversazioni server con quelle già create in pagina (prima dell'hydrate). */
export function mergeConversations(
  server: ConversationRecord[],
  local: ConversationRecord[]
): ConversationRecord[] {
  const map = new Map<string, ConversationRecord>();
  for (const c of server) map.set(c.id, c);
  for (const loc of local) {
    const srv = map.get(loc.id);
    if (!srv) {
      map.set(loc.id, loc);
      continue;
    }
    if (loc.messages.length > srv.messages.length) map.set(loc.id, loc);
    else if (
      conversationUpdatedAtMs(loc) > conversationUpdatedAtMs(srv) &&
      loc.messages.length >= srv.messages.length
    ) {
      map.set(loc.id, loc);
    }
  }
  return sortConversations(excludeDeletedConversations([...map.values()]));
}
