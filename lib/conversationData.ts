import type {
  ConversationChannel,
  ConversationRecord,
} from "./conversationTypes";

// =============================================================
// DATI MOCK — conversazioni live chat
// Sostituire in produzione con API/WebSocket del cliente.
// =============================================================

export const CURRENT_OPERATOR = {
  id: "op-demo",
  name: "Tu",
} as const;

export const CONVERSATION_CHANNEL_LABELS: Record<ConversationChannel, string> =
  {
    live_chat: "Live chat",
    embed: "Widget embed",
    assistenza: "Assistenza AI",
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

function msg(
  id: string,
  role: "user" | "assistant" | "agent",
  content: string,
  time: string
) {
  return { id, role, content, timestampLabel: time };
}

export const MOCK_CONVERSATIONS: ConversationRecord[] = [
  {
    id: "CONV-1042",
    customerName: "Marco Bianchi",
    customerEmail: "marco.bianchi@officina-rossi.it",
    status: "aperto",
    assignee: "ai",
    channel: "embed",
    lastMessagePreview:
      "Ho bisogno del codice ricambio per il mandrino della FZ-500…",
    lastMessageLabel: "14:22",
    createdFull: "Oggi, 14:18",
    updatedFull: "Oggi, 14:22",
    visitorOnline: true,
    machineModel: "Fresatrice FZ-500",
    machineSerial: "FR-3092",
    messages: [
      msg(
        "m1",
        "assistant",
        "Buongiorno, sono l'assistente service di aestima. Posso aiutarti a identificare ricambi o risolvere malfunzionamenti. Come posso aiutarti?",
        "14:18"
      ),
      msg(
        "m2",
        "user",
        "Ho bisogno del codice ricambio per il mandrino della FZ-500 matricola FR-3092",
        "14:19"
      ),
      msg(
        "m3",
        "assistant",
        "Per la fresatrice FZ-500 (FR-3092) in distinta risulta il mandrino principale cod. MZ-4401. Vuoi che verifichi disponibilità e tempi di consegna?",
        "14:22"
      ),
    ],
  },
  {
    id: "CONV-1038",
    customerName: "Laura Ferretti",
    customerEmail: "l.ferretti@metaltech.it",
    status: "aperto",
    assignee: "operatore",
    assignedOperatorId: CURRENT_OPERATOR.id,
    channel: "live_chat",
    lastMessagePreview:
      "Un secondo prego… Ho aumentato i privilegi del suo account.",
    lastMessageLabel: "11:45",
    createdFull: "Ieri, 16:30",
    updatedFull: "Oggi, 11:45",
    visitorOnline: false,
    machineModel: "Tornio TC-200",
    messages: [
      msg(
        "m1",
        "assistant",
        "Buongiorno! Descrivi il problema o allega una foto della macchina.",
        "16:30"
      ),
      msg(
        "m2",
        "user",
        "Il tornio TC-200 non carica il programma CNC dopo l'ultimo aggiornamento firmware.",
        "16:32"
      ),
      msg(
        "m3",
        "assistant",
        "Ho verificato la knowledge base: potrebbe essere un problema di permessi USB. Apro un ticket per il team tecnico?",
        "16:33"
      ),
      msg(
        "m4",
        "user",
        "Sì, per favore. È urgente, la produzione è ferma.",
        "16:34"
      ),
      msg(
        "m5",
        "agent",
        "Un secondo prego… Ho aumentato i privilegi del suo account. Provi a reinserire la chiavetta USB e riavviare il pannello operatore.",
        "11:45"
      ),
    ],
  },
  {
    id: "CONV-1021",
    customerName: "Giuseppe Verdi",
    customerEmail: "g.verdi@industria-spa.com",
    status: "risolto",
    assignee: "operatore",
    assignedOperatorId: CURRENT_OPERATOR.id,
    channel: "assistenza",
    lastMessagePreview: "Perfetto, grazie mille per l'assistenza!",
    lastMessageLabel: "3g",
    createdFull: "5 giorni fa",
    updatedFull: "3 giorni fa",
    visitorOnline: false,
    messages: [
      msg(
        "m1",
        "user",
        "Dove trovo il manuale di manutenzione del tornio TC-200?",
        "09:10"
      ),
      msg(
        "m2",
        "assistant",
        "Il manuale è disponibile nell'archivio documenti, sezione Manutenzione > Torni TC-200.",
        "09:11"
      ),
      msg("m3", "user", "Perfetto, grazie mille per l'assistenza!", "09:12"),
      msg(
        "m4",
        "agent",
        "Ottimo, per altri dubbi non esiti a contattarci. Buona giornata!",
        "09:13"
      ),
    ],
  },
];
