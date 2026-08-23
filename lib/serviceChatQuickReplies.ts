import type { ServiceMachine } from "./serviceChatData";
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

/** Macchine presenti nella company (o demo Spark). Senza parco: nessuna bubble. */
export function machineQuickReplies(
  machines: Pick<ServiceMachine, "model" | "serial">[] = []
): QuickReplyOption[] {
  if (machines.length === 0) {
    return [];
  }
  return [
    ...machines.map((m) => ({
      label: `${m.model} · ${m.serial}`,
      value: `Matricola ${m.serial} — ${m.model}`,
    })),
    MACHINE_NOT_LISTED_QUICK_REPLY,
  ];
}

function isMachineSelectionReplies(
  replies: QuickReplyOption[],
  machines: Pick<ServiceMachine, "model" | "serial">[]
): boolean {
  const serials = machines.map((m) => m.serial.toLowerCase()).filter(Boolean);
  if (serials.length === 0) return false;
  return replies.some((r) => {
    const hay = `${r.label} ${r.value}`.toLowerCase();
    return serials.some((s) => hay.includes(s));
  });
}

const DEMO_MACHINE_LEAK =
  /vallmec|valmec|vlm-?\s*2200|vlm-?\s*1800|matricola\s*[:.—–-]?\s*13\d{2}|matricola\s*[:.—–-]?\s*14\d{2}|\b1389\b|\b1418\b|\b1412\b|\b1432\b/i;

const MACHINE_PARK_REPLY =
  /matricola|vlm-?\s*\d|vallmec|valmec|parco macchine|macchina non è in elenco|quale macchina|modello o la matricola/i;

/** Toglie bubble di matricole demo se non appartengono alla company. */
export function filterHallucinatedMachineReplies(
  replies: QuickReplyOption[] | undefined,
  machines: Pick<ServiceMachine, "model" | "serial">[]
): QuickReplyOption[] | undefined {
  if (!replies?.length) return replies;
  const allowed = new Set(
    machines.flatMap((m) => [
      m.serial.toLowerCase(),
      m.model.toLowerCase(),
    ])
  );
  const filtered = replies.filter((r) => {
    const hay = `${r.label} ${r.value}`.toLowerCase();
    if (!DEMO_MACHINE_LEAK.test(hay)) return true;
    return [...allowed].some((a) => a && hay.includes(a));
  });
  return filtered.length > 0 ? filtered : undefined;
}

/** Aggiunge "Altro" se le bubble elencano macchine note ma manca l'opzione manuale. */
export function ensureMachineOtherOption(
  replies: QuickReplyOption[] | undefined,
  machines: Pick<ServiceMachine, "model" | "serial">[] = []
): QuickReplyOption[] | undefined {
  const cleaned = filterHallucinatedMachineReplies(replies, machines);
  if (!cleaned?.length) return undefined;

  if (machines.length === 0) {
    const withoutPark = cleaned.filter((r) => {
      const hay = `${r.label} ${r.value}`;
      return !MACHINE_PARK_REPLY.test(hay) && !DEMO_MACHINE_LEAK.test(hay);
    });
    return withoutPark.length > 0 ? withoutPark : undefined;
  }

  if (!isMachineSelectionReplies(cleaned, machines)) {
    return cleaned;
  }
  const hasOther = cleaned.some(
    (r) =>
      r.value === MACHINE_NOT_LISTED_QUICK_REPLY.value ||
      /non è in elenco/i.test(r.value)
  );
  if (hasOther) return cleaned;
  return [...cleaned, MACHINE_NOT_LISTED_QUICK_REPLY];
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
  opts?: {
    isWelcome?: boolean;
    hasSpareParts?: boolean;
    machines?: Pick<ServiceMachine, "model" | "serial" | "parts">[];
  }
): QuickReplyOption[] | undefined {
  if (opts?.hasSpareParts) return undefined;

  if (opts?.isWelcome) return WELCOME_QUICK_REPLIES;

  const machines = opts?.machines ?? [];
  const catalogOnly = machines.length === 0;
  const text = assistantContent.toLowerCase();
  const users = messages.filter((m) => m.role === "user");
  const userText = userHistoryText(messages);
  const machineKnown = machineIdentifiedInHistory(messages, machines);

  const lastUser = users[users.length - 1];
  if (lastUser && isMachineNotListedIntent(lastUser.content)) {
    return undefined;
  }
  if (lastUser && isFreeDescriptionIntent(lastUser.content) && !machineKnown) {
    return catalogOnly ? undefined : machineQuickReplies(machines);
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
    return catalogOnly ? undefined : machineQuickReplies(machines);
  }

  const spareIntent = /ricamb|pezzo|codice|componente|distinta/.test(userText);
  if (
    machineKnown &&
    lastUser &&
    isMachineIdentificationOnly(lastUser.content, machines)
  ) {
    if (spareIntent && !malfunctionIntent) {
      const machine = machines.find(
        (m) =>
          userText.includes(m.serial.toLowerCase()) ||
          userText.includes(m.model.toLowerCase())
      );
      if (machine && "parts" in machine && machine.parts?.length) {
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

  if (
    asksSymptom ||
    (malfunctionIntent &&
      machineKnown &&
      lastUser &&
      !isMachineIdentificationOnly(lastUser.content, machines))
  ) {
    return symptomQuickReplies();
  }

  if (users.length === 1 && !machineKnown) {
    const spareIntentFirst = /ricamb|pezzo|codice|componente/.test(userText);
    if (spareIntentFirst || malfunctionIntent) {
      return catalogOnly ? undefined : machineQuickReplies(machines);
    }
  }

  return undefined;
}
