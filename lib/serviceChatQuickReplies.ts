import { SERVICE_MACHINES } from "./serviceChatData";
import {
  machineIdentifiedInHistory,
  userHistoryText,
  isMachineIdentificationOnly,
} from "./knowledgeSearch";
import type { CreateTicketInput } from "./ticketTypes";
import type { QuickReplyOption } from "./serviceChatTypes";

// =============================================================
// Quick-reply guidate — scorciatoie cliccabili per la chat
// Opzioni coerenti con i dati di esempio in serviceChatData.
// =============================================================

/** Bubble iniziali mostrate al benvenuto, prima del primo input. */
export const WELCOME_QUICK_REPLIES: QuickReplyOption[] = [
  { label: "Cerco un ricambio", value: "Cerco un ricambio" },
  { label: "Ho un malfunzionamento", value: "Ho un malfunzionamento" },
  {
    label: "Non trovo il codice di un pezzo",
    value: "Non trovo il codice di un pezzo",
  },
  { label: "Altro", value: "Altro — preferisco descrivere liberamente" },
];

/** Macchine presenti nella base dati demo. */
export function machineQuickReplies(): QuickReplyOption[] {
  return SERVICE_MACHINES.map((m) => ({
    label: `${m.model} · ${m.serial}`,
    value: `Matricola ${m.serial} — ${m.model}`,
  }));
}

/** Sintomi comuni dalla KB troubleshooting (label brevi per proiettore). */
export function symptomQuickReplies(): QuickReplyOption[] {
  return [
    {
      label: "Rumore metallico curva rinvio",
      value:
        "Rumore metallico intermittente dalla curva di rinvio durante il sollevamento, soprattutto a carico pieno.",
    },
    {
      label: "Slittamento fune / perdita tensione",
      value:
        "Slittamento della fune sul semidisco di giunzione, perdita di tensione dopo pochi cicli.",
    },
    {
      label: "Errore E-47 tensione fune",
      value:
        "Errore E-47 sul pannello: tensione fune fuori range dopo sostituzione cavo.",
    },
    {
      label: "Perdita olio dal mandrino",
      value:
        "Perdita olio dal mandrino, gocciolamento visibile sotto la testa rettifica durante l'uso.",
    },
    {
      label: "Vibrazione anomala mandrino",
      value:
        "Vibrazione anomala mandrino a 3000 rpm, pezzo non rettificato entro tolleranza.",
    },
  ];
}

function normalizeQuickReply(raw: unknown): QuickReplyOption | null {
  if (typeof raw === "string" && raw.trim()) {
    const t = raw.trim();
    return { label: t, value: t };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const label = String(o.label ?? o.text ?? "").trim();
    const value = String(o.value ?? o.label ?? o.text ?? "").trim();
    if (label && value) return { label, value };
  }
  return null;
}

/** Normalizza quickReplies restituite dall'API Claude. */
export function normalizeApiQuickReplies(raw: unknown): QuickReplyOption[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: QuickReplyOption[] = [];
  for (const item of raw) {
    const opt = normalizeQuickReply(item);
    if (opt) out.push(opt);
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Fallback client-side: propone bubble coerenti col flusso quando
 * l'API non ne restituisce (o per il messaggio di benvenuto).
 */
export function inferQuickReplies(
  messages: { role: string; content: string; id?: string }[],
  assistantContent: string,
  opts?: { isWelcome?: boolean; hasTicket?: boolean; hasSpareParts?: boolean }
): QuickReplyOption[] | undefined {
  if (opts?.hasTicket || opts?.hasSpareParts) return undefined;

  if (opts?.isWelcome) return WELCOME_QUICK_REPLIES;

  const text = assistantContent.toLowerCase();
  const users = messages.filter((m) => m.role === "user");
  const userText = userHistoryText(messages);
  const machineKnown = machineIdentifiedInHistory(messages);

  const asksMachine =
    /matricol|modello|quale macchina|identific|precisare|variante|indicami la macchina|quale impianto/.test(
      text
    );
  const asksSymptom =
    /sintom|descriv.*problem|cosa succede|che problem|malfunzion|guasto|cosa noti|cosa osserv/.test(
      text
    );
  const malfunctionIntent =
    /malfunzion|non funziona|problema|guasto|errore|sintom/.test(userText);

  if (asksMachine && !machineKnown) {
    return machineQuickReplies();
  }

  const lastUser = users[users.length - 1];
  if (
    machineKnown &&
    lastUser &&
    isMachineIdentificationOnly(lastUser.content)
  ) {
    return symptomQuickReplies();
  }

  if (asksSymptom || (malfunctionIntent && machineKnown && lastUser && !isMachineIdentificationOnly(lastUser.content))) {
    return symptomQuickReplies();
  }

  // Primo scambio dopo scelta intent: se manca la macchina, proponi modelli.
  if (users.length === 1 && !machineKnown) {
    const spareIntent = /ricamb|pezzo|codice|componente/.test(userText);
    if (spareIntent || malfunctionIntent) {
      return machineQuickReplies();
    }
  }

  return undefined;
}

/** Estrae macchina e categoria dalla cronologia chat per registrare il ticket. */
export function inferTicketContextFromChat(
  messages: { role: string; content: string }[]
): Pick<
  CreateTicketInput,
  "machineModel" | "machineSerial" | "category" | "description"
> {
  const userLines = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const haystack = userLines.join(" ").toLowerCase();

  const machine = SERVICE_MACHINES.find(
    (m) =>
      haystack.includes(m.serial.toLowerCase()) ||
      haystack.includes(m.model.toLowerCase())
  );

  let category: CreateTicketInput["category"] = "altro";
  if (/malfunzion|problema|guasto|errore|sintom/.test(haystack)) {
    category = "troubleshooting";
  } else if (/ricamb|pezzo|codice|componente/.test(haystack)) {
    category = "ricambio";
  }

  const description = userLines.length
    ? `Cronologia chat:\n${userLines.map((l) => `• ${l}`).join("\n")}`
    : "";

  return {
    machineModel: machine?.model,
    machineSerial: machine?.serial,
    category,
    description,
  };
}
