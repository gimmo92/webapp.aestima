import { SERVICE_MACHINES } from "./serviceChatData";
import {
  machineIdentifiedInHistory,
  userHistoryText,
  isMachineIdentificationOnly,
  isFreeDescriptionIntent,
  isMachineNotListedIntent,
} from "./knowledgeSearch";
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

/** Bubble "macchina non in elenco" accanto alle matricole note. */
export const MACHINE_NOT_LISTED_QUICK_REPLY: QuickReplyOption = {
  label: "Altro",
  value: "La macchina non è in elenco — indico modello o matricola",
};

/** Macchine presenti nella base dati demo. */
export function machineQuickReplies(): QuickReplyOption[] {
  return [
    ...SERVICE_MACHINES.map((m) => ({
      label: `${m.model} · ${m.serial}`,
      value: `Matricola ${m.serial} — ${m.model}`,
    })),
    MACHINE_NOT_LISTED_QUICK_REPLY,
  ];
}

function isMachineSelectionReplies(replies: QuickReplyOption[]): boolean {
  const serials = SERVICE_MACHINES.map((m) => m.serial.toLowerCase());
  return replies.some((r) => {
    const hay = `${r.label} ${r.value}`.toLowerCase();
    return serials.some((s) => hay.includes(s));
  });
}

/** Aggiunge "Altro" se le bubble elencano macchine note ma manca l'opzione manuale. */
export function ensureMachineOtherOption(
  replies: QuickReplyOption[] | undefined
): QuickReplyOption[] | undefined {
  if (!replies?.length || !isMachineSelectionReplies(replies)) return replies;
  const hasOther = replies.some(
    (r) =>
      r.value === MACHINE_NOT_LISTED_QUICK_REPLY.value ||
      /non è in elenco/i.test(r.value)
  );
  if (hasOther) return replies;
  return [...replies, MACHINE_NOT_LISTED_QUICK_REPLY];
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
  opts?: { isWelcome?: boolean; hasSpareParts?: boolean }
): QuickReplyOption[] | undefined {
  if (opts?.hasSpareParts) return undefined;

  if (opts?.isWelcome) return WELCOME_QUICK_REPLIES;

  const text = assistantContent.toLowerCase();
  const users = messages.filter((m) => m.role === "user");
  const userText = userHistoryText(messages);
  const machineKnown = machineIdentifiedInHistory(messages);

  const lastUser = users[users.length - 1];
  if (lastUser && isMachineNotListedIntent(lastUser.content)) {
    return undefined;
  }
  if (lastUser && isFreeDescriptionIntent(lastUser.content) && !machineKnown) {
    return machineQuickReplies();
  }

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

  const spareIntent = /ricamb|pezzo|codice|componente|distinta/.test(userText);
  if (
    machineKnown &&
    lastUser &&
    isMachineIdentificationOnly(lastUser.content)
  ) {
    if (spareIntent && !malfunctionIntent) {
      const machine = SERVICE_MACHINES.find((m) =>
        userText.includes(m.serial.toLowerCase()) ||
        userText.includes(m.model.toLowerCase())
      );
      if (machine) {
        return machine.parts.slice(0, 4).map((p) => ({
          label:
            p.description.length > 42
              ? `${p.description.slice(0, 39)}…`
              : p.description,
          value: `Mi serve: ${p.description} (cod. ${p.code})`,
        }));
      }
    }
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
