import { SERVICE_MACHINES } from "./serviceChatData";
import type { KnowledgeEntry } from "./knowledgeTypes";

// Ricerca euristica nella KB lato server (in produzione: embedding / vector search).

const SYMPTOM_HINTS = [
  "malfunzionamento",
  "rumore",
  "perdita",
  "errore",
  "vibrazione",
  "slittamento",
  "guasto",
  "allarme",
  "problema",
  "non funziona",
  "gocciol",
  "tensione",
  "olio",
  "mandrino",
  "fune",
  "curva",
  "cavo",
  "non carica",
  "bloccato",
  "surriscalda",
];

/** Intent generico — non sufficiente per cercare in KB. */
const INTENT_ONLY_PATTERNS = [
  /^ho un malfunzionamento\.?$/i,
  /^cerco un ricambio\.?$/i,
  /^non trovo il codice di un pezzo\.?$/i,
  /^altro\b/i,
];

/** Utente sceglie "Altro — preferisco descrivere liberamente" dalle bubble iniziali. */
export function isFreeDescriptionIntent(text: string): boolean {
  return /^altro\b/i.test(text.trim());
}

export function userHistoryText(
  messages: { role: string; content: string }[]
): string {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.toLowerCase())
    .join(" ");
}

export function machineIdentifiedInHistory(
  messages: { role: string; content: string }[]
): boolean {
  const haystack = userHistoryText(messages);
  return SERVICE_MACHINES.some(
    (m) =>
      haystack.includes(m.serial.toLowerCase()) ||
      haystack.includes(m.model.toLowerCase())
  );
}

/** Ultimo messaggio utente = solo matricola/modello, senza descrizione guasto. */
export function isMachineIdentificationOnly(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  const hasMachine = SERVICE_MACHINES.some(
    (m) =>
      lower.includes(m.serial.toLowerCase()) ||
      lower.includes(m.model.toLowerCase())
  );
  if (!hasMachine) return false;

  if (INTENT_ONLY_PATTERNS.some((p) => p.test(trimmed))) return false;

  let stripped = lower;
  for (const m of SERVICE_MACHINES) {
    stripped = stripped.replaceAll(m.serial.toLowerCase(), "");
    stripped = stripped.replaceAll(m.model.toLowerCase(), "");
  }
  stripped = stripped
    .replace(/matricola|impianto|fresatrice|rettificatrice|tornio/gi, "")
    .replace(/[—–\-:,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (stripped.length > 40) return false;

  const symptomInRemainder = SYMPTOM_HINTS.some((h) => stripped.includes(h));
  return !symptomInRemainder;
}

/** Descrizione concreta del guasto (non solo intent o matricola). */
export function isSymptomDescription(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || isMachineIdentificationOnly(trimmed)) return false;
  if (INTENT_ONLY_PATTERNS.some((p) => p.test(trimmed))) return false;

  const lower = trimmed.toLowerCase();
  if (trimmed.length >= 55 && SYMPTOM_HINTS.some((h) => lower.includes(h))) {
    return true;
  }

  const concretePatterns = [
    /rumore/,
    /perdita/,
    /errore\s*e-?\d*/i,
    /vibrazion/,
    /slittament/,
    /gocciol/,
    /non funziona/,
    /non carica/,
    /fuori range/,
    /allarme/,
    /bloccato/,
    /surriscald/,
  ];
  return concretePatterns.some((p) => p.test(lower));
}

export function isTroubleshootingQuery(text: string): boolean {
  const q = text.toLowerCase();
  return SYMPTOM_HINTS.some((h) => q.includes(h));
}

/** Utente chiede esplicitamente apertura ticket o conferma escalation. */
export function isTicketEscalationIntent(
  messages: { role: string; content: string }[],
  lastUserText: string
): boolean {
  const trimmed = lastUserText.trim();
  const lower = trimmed.toLowerCase();

  if (
    /apri(re)?\s+(un\s+)?ticket/.test(lower) ||
    /crea(re)?\s+(un\s+)?ticket/.test(lower) ||
    /voglio\s+(aprire\s+)?(un\s+)?ticket/.test(lower) ||
    /procedi\s+con\s+(l')?apertura\s+(del\s+)?ticket/.test(lower) ||
    (/ticket/.test(lower) &&
      /^(sì|si|ok|certo|procedi|vai|apri)\b/.test(lower))
  ) {
    return true;
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistant) return false;

  const offeredTicket =
    /apertura del ticket|aprire un ticket|proceda con.*ticket|vuoi che proceda/i.test(
      lastAssistant.content
    );
  if (!offeredTicket) return false;

  return (
    /^(sì|si|ok|certo|procedi|vai|apri)\.?$/i.test(trimmed) ||
    /sì.*ticket|apri.*ticket/i.test(lower)
  );
}

/**
 * KB ricercabile solo dopo: macchina identificata + guasto descritto
 * nell'ultimo messaggio utente. Mai se l'utente chiede un ticket.
 */
export function isReadyForKbSearch(
  messages: { role: string; content: string }[],
  lastUserText: string
): boolean {
  if (isTicketEscalationIntent(messages, lastUserText)) return false;
  if (!machineIdentifiedInHistory(messages)) return false;
  if (isMachineIdentificationOnly(lastUserText)) return false;
  return isSymptomDescription(lastUserText);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function scoreEntry(entry: KnowledgeEntry, query: string): number {
  const qTokens = new Set(tokenize(query));
  const corpus = [
    entry.symptom,
    entry.probableCause,
    entry.solution,
    entry.machineModel,
    entry.machineSerial ?? "",
    ...entry.tags,
    ...entry.spareParts.map((p) => `${p.code} ${p.description}`),
  ]
    .join(" ")
    .toLowerCase();

  let score = 0;
  for (const t of qTokens) {
    if (corpus.includes(t)) score += 2;
  }

  if (
    entry.machineSerial &&
    query.toLowerCase().includes(entry.machineSerial.toLowerCase())
  ) {
    score += 5;
  }

  for (const tag of entry.tags) {
    if (query.toLowerCase().includes(tag.toLowerCase())) score += 4;
  }

  return score;
}

/** Trova le voci KB più pertinenti al messaggio utente (top N). */
export function findKbCandidates(
  knowledgeBase: KnowledgeEntry[],
  userText: string,
  recentContext = ""
): KnowledgeEntry[] {
  const combined = `${recentContext} ${userText}`.trim();
  if (!isSymptomDescription(userText)) return [];

  const scored = knowledgeBase
    .map((entry) => ({ entry, score: scoreEntry(entry, combined) }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((x) => x.entry);
}

export function formatKbCandidatesForPrompt(
  candidates: KnowledgeEntry[],
  ready: boolean
): string {
  if (!ready) {
    return `## RICERCA KB — NON ATTIVA
L'utente ha indicato la macchina ma NON ha ancora descritto il guasto.
Conferma la macchina e chiedi di descrivere sintomi e comportamento anomalo.
Proponi quickReplies con sintomi tipici. NON cercare nella KB. NON proporre soluzioni. kbMatch deve essere null.`;
  }
  if (candidates.length === 0) {
    return "## RICERCA AUTOMATICA KB\nNessuna corrispondenza forte. Cerca nella KB completa; se non trovi, comunica esito ricerca e proponi ticket.";
  }
  const lines = candidates.map(
    (e) =>
      `- ${e.id}: ${e.symptom.slice(0, 120)}… (frequenza ${e.frequency}×)`
  );
  return `## RICERCA AUTOMATICA KB\nCorrispondenze probabili per il guasto descritto:\n${lines.join("\n")}\nUsa la voce pertinente, imposta kbMatch e cita la scheda nel Manuale.`;
}

export function formatTicketEscalationBlock(): string {
  return `## RICHIESTA APERTURA TICKET
L'utente chiede esplicitamente di aprire un ticket (o ha confermato l'escalation).
NON cercare nella knowledge base. NON scrivere "verifico nella knowledge base" o frasi simili.
Conferma l'apertura del ticket in modo breve e professionale.
Imposta "ticket" con summary descrittivo del problema. kbMatch deve essere null.`;
}
