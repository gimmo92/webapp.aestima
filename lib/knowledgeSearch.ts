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
  /^altro\s*[—–-]\s*preferisco descrivere liberamente/i,
  /^la macchina non è in elenco/i,
];

/** Utente sceglie "Altro — preferisco descrivere liberamente" dalle bubble iniziali. */
export function isFreeDescriptionIntent(text: string): boolean {
  return /^altro\s*[—–-]\s*preferisco descrivere liberamente/i.test(
    text.trim()
  );
}

/** Utente indica che la macchina non è tra quelle proposte in elenco. */
export function isMachineNotListedIntent(text: string): boolean {
  return /non è in elenco|macchina non in elenco/i.test(text.trim());
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

export function isReadyForKbSearch(
  messages: { role: string; content: string }[],
  lastUserText: string
): boolean {
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
    return "## RICERCA AUTOMATICA KB\nNessuna corrispondenza forte. Cerca nella KB completa; se non trovi, comunica esito ricerca e invita l'utente ad aggiungere dettagli per un operatore.";
  }
  const lines = candidates.map(
    (e) =>
      `- ${e.id}: ${e.symptom.slice(0, 120)}… (frequenza ${e.frequency}×)`
  );
  return `## RICERCA AUTOMATICA KB\nCorrispondenze probabili per il guasto descritto:\n${lines.join("\n")}\nUsa la voce pertinente, imposta kbMatch e cita la scheda nel Manuale.`;
}
