import type {
  ConversationChannel,
  ConversationRecord,
} from "./conversationTypes";

export const CURRENT_OPERATOR = {
  id: "op-demo",
  name: "Tu",
} as const;

export const CONVERSATION_CHANNEL_LABELS: Record<ConversationChannel, string> =
  {
    live_chat: "Live chat",
    embed: "Widget embed",
    assistenza: "Assistenza AI",
    inbox: "Email inbox",
  };

export type ConversationFilter =
  | "non_assegnate"
  | "miei_aperti"
  | "risolte"
  | "tutte";

export const CONVERSATION_FILTERS: {
  id: ConversationFilter;
  label: string;
  section?: string;
}[] = [
  { id: "non_assegnate", label: "Non assegnate", section: "Live chat" },
  { id: "miei_aperti", label: "I miei aperti", section: "Live chat" },
  { id: "risolte", label: "Risolte", section: "Live chat" },
  { id: "tutte", label: "Tutte", section: "Altro" },
];

export function newConversationId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `CONV-${n}`;
}

export const MOCK_CONVERSATIONS: ConversationRecord[] = [];
