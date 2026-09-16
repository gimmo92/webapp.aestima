// =============================================================
// Bozza rapporto d'intervento — tipi condivisi client/server
// e generazione deterministica di fallback quando l'AI non è
// disponibile (chiave Anthropic assente o chiamata fallita).
// =============================================================

import type {
  InterventionReportOutcome,
  InterventionReportType,
} from "./technicianTypes";

export type ReportSourceKind = "audio" | "testo" | "documento" | "chat";

export interface ReportSourceInput {
  kind: ReportSourceKind;
  /** Etichetta mostrata nel rapporto, es. «Vocale 0:14 — Marco Benedetti». */
  label: string;
  /** Trascrizione, testo del messaggio o estratto del documento. */
  excerpt?: string;
}

/** Come il cliente ha reagito all'intervento. */
export type CustomerSentiment = "positivo" | "neutro" | "critico";

export const CUSTOMER_SENTIMENTS: {
  id: CustomerSentiment;
  label: string;
  color: string;
}[] = [
  { id: "positivo", label: "Cliente soddisfatto", color: "#2e9e5b" },
  { id: "neutro", label: "Feedback neutro", color: "#8e8b89" },
  { id: "critico", label: "Cliente critico", color: "#d8562a" },
];

export interface ReportDraftInput {
  technicianName: string;
  customerCompany?: string;
  /** Modello/matricola già noti dalla scheda contatto. */
  machineHint?: string;
  /** Note dettate o scritte dall'operatore sui lavori. */
  notes?: string;
  /** Cosa ha detto il cliente: commenti, lamentele, richieste. */
  feedbackNotes?: string;
  sources: ReportSourceInput[];
}

export interface ReportDraft {
  machineModel: string;
  machineSerial?: string;
  interventionDate: string;
  type: InterventionReportType;
  outcome: InterventionReportOutcome;
  hours: number;
  summary: string;
  workPerformed: string;
  partsUsed: string[];
  followUp?: string;
  /** Riscontro del cliente sull'intervento, nelle sue parole. */
  customerFeedback?: string;
  customerSentiment?: CustomerSentiment;
  /** Richieste commerciali emerse: nuovi modelli, upgrade, preventivi. */
  customerRequests?: string[];
}

const TYPE_KEYWORDS: { type: InterventionReportType; words: string[] }[] = [
  { type: "sostituzione", words: ["sostitu", "cambiat", "rimpiazz", "nuovo pezzo"] },
  { type: "installazione", words: ["installa", "montaggio nuovo", "messa in servizio"] },
  { type: "verifica", words: ["verific", "collaud", "controll", "ispezion", "taratur"] },
  { type: "riparazione", words: ["ripara", "saldat", "ripristin", "guast", "rott"] },
  { type: "manutenzione", words: ["manutenzion", "pulizia", "lubrific", "ingrass"] },
];

const OUTCOME_KEYWORDS: {
  outcome: InterventionReportOutcome;
  words: string[];
}[] = [
  {
    outcome: "followup",
    words: [
      "follow",
      "da rivedere",
      "torniamo",
      "secondo intervento",
      "ordinare",
      "in attesa del ricambio",
      "non risolto",
    ],
  },
  { outcome: "parziale", words: ["parzial", "provvisori", "tampone"] },
  {
    outcome: "completato",
    words: ["risolt", "completat", "concluso", "ripartit", "funziona", "chiuso"],
  },
];

/** Frasi che di solito riportano la voce del cliente. */
const FEEDBACK_MARKERS = [
  "il cliente",
  "la cliente",
  "del cliente",
  "ci ha detto",
  "si lamenta",
  "lamentat",
  "vorrebbe",
  "vorrebbero",
  "chiede",
  "chiedono",
  "ha chiesto",
  "preferirebbe",
  "gli operatori",
  "il manutentore",
  "il capoturno",
  "il responsabile",
];

const SENTIMENT_NEGATIVE = [
  "scomod",
  "lament",
  "insoddisf",
  "scontent",
  "troppo caro",
  "costos",
  "critic",
  "arrabbiat",
  "non contento",
  "fastidios",
  "difficolt",
  "deluso",
  "fermo da",
];

const SENTIMENT_POSITIVE = [
  "soddisfatt",
  "content",
  "ottimo",
  "perfetto",
  "apprezz",
  "ringrazia",
  "tutto ok",
  "nessun problema",
];

/** Richieste commerciali da girare al reparto vendite. */
const REQUEST_MARKERS = [
  "vorrebbe",
  "vorrebbero",
  "chiede",
  "chiedono",
  "ha chiesto",
  "preferirebbe",
  "preventivo",
  "offerta",
  "modello",
  "upgrade",
  "sostituire la macchina",
  "economic",
];

const MACHINE_KEYWORDS = [
  "sorter multishuttle",
  "multishuttle",
  "trasloelevatore",
  "palletizzatore",
  "incartonatrice",
  "conveyor",
  "sorter",
  "navetta",
  "pressa",
  "agv",
  "nastro trasportatore",
];

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function collectText(input: ReportDraftInput): string {
  return [input.notes ?? "", ...input.sources.map((s) => s.excerpt ?? "")]
    .filter((part) => part.trim())
    .join("\n")
    .trim();
}

function detectType(text: string): InterventionReportType {
  const lower = text.toLowerCase();
  for (const entry of TYPE_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) return entry.type;
  }
  return "manutenzione";
}

function detectOutcome(text: string): InterventionReportOutcome {
  const lower = text.toLowerCase();
  for (const entry of OUTCOME_KEYWORDS) {
    if (entry.words.some((w) => lower.includes(w))) return entry.outcome;
  }
  return "completato";
}

function detectHours(text: string): number {
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:ore|ora\b|h\b)/i);
  if (!match) return 1;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 && value < 24 ? value : 1;
}

function detectMachine(input: ReportDraftInput, text: string): string {
  const hint = input.machineHint?.trim();
  if (hint) return hint;
  const lower = text.toLowerCase();
  const found = MACHINE_KEYWORDS.find((k) => lower.includes(k));
  return found ? capitalize(found) : "Macchina non specificata";
}

function detectSerial(text: string): string | undefined {
  const match = text.match(/matricol[ae]\s*(?:n\.?|numero)?\s*:?\s*([A-Za-z0-9-]{3,})/i);
  return match ? match[1] : undefined;
}

/** Codici ricambio: almeno una cifra e una lettera o un separatore. */
function detectParts(text: string, serial?: string): string[] {
  const matches = text.match(/\b[A-Z0-9][A-Z0-9/-]{4,}\b/g) ?? [];
  const parts = matches
    .map((code) => code.replace(/[.,;:]+$/, ""))
    .filter((code) => /\d/.test(code) && /[A-Z-/]/.test(code))
    .filter((code) => code.toLowerCase() !== serial?.toLowerCase());
  return Array.from(new Set(parts)).slice(0, 6);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Separa la voce del cliente dal resto del racconto tecnico. */
function splitCustomerVoice(text: string): { feedback: string; rest: string } {
  const feedback: string[] = [];
  const rest: string[] = [];
  for (const sentence of splitSentences(text)) {
    const lower = sentence.toLowerCase();
    if (FEEDBACK_MARKERS.some((marker) => lower.includes(marker))) {
      feedback.push(sentence);
    } else {
      rest.push(sentence);
    }
  }
  return { feedback: feedback.join(" "), rest: rest.join(" ") };
}

/** Sentiment del riscontro cliente: usato anche in fase di analisi. */
export function analyzeSentiment(
  feedback: string
): CustomerSentiment | undefined {
  return detectSentiment(feedback);
}

function detectSentiment(feedback: string): CustomerSentiment | undefined {
  if (!feedback.trim()) return undefined;
  const lower = feedback.toLowerCase();
  if (SENTIMENT_NEGATIVE.some((word) => lower.includes(word))) return "critico";
  if (SENTIMENT_POSITIVE.some((word) => lower.includes(word))) return "positivo";
  return "neutro";
}

function detectRequests(feedback: string): string[] {
  const sentences = splitSentences(feedback);
  // Con una sola frase la richiesta è il feedback stesso: non lo ripetiamo.
  if (sentences.length < 2) return [];
  return sentences
    .filter((sentence) => {
      const lower = sentence.toLowerCase();
      return REQUEST_MARKERS.some((marker) => lower.includes(marker));
    })
    .slice(0, 3);
}

function firstSentence(text: string, max = 120): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const stop = clean.search(/[.!?](\s|$)/);
  const sentence = stop > 20 ? clean.slice(0, stop) : clean;
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

export function todayDateLabel(date = new Date()): string {
  return date.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Bozza compilata con regole locali: nessuna chiamata esterna. */
export function buildReportDraftFallback(input: ReportDraftInput): ReportDraft {
  const text = collectText(input);
  const serial = detectSerial(text);

  // Il riscontro del cliente viaggia in un campo suo: se l'operatore lo ha
  // dettato insieme ai lavori, lo si estrae dalle frasi che lo citano.
  const explicit = input.feedbackNotes?.trim() ?? "";
  const notes = input.notes?.trim() ?? "";
  const fromNotes = explicit ? { feedback: "", rest: notes } : splitCustomerVoice(notes);
  const fromSources = explicit || fromNotes.feedback
    ? { feedback: "", rest: "" }
    : splitCustomerVoice(
        input.sources.map((source) => source.excerpt ?? "").join("\n")
      );
  const customerFeedback =
    explicit || fromNotes.feedback || fromSources.feedback || "";

  // Nei lavori eseguiti finiscono le note tecniche, o in mancanza le
  // trascrizioni: le fonti restano comunque elencate sul rapporto.
  const workPerformed =
    fromNotes.rest ||
    (explicit ? text : "") ||
    `Intervento riferito da ${input.technicianName} via WhatsApp. Dettagli tecnici da completare.`;

  return {
    machineModel: detectMachine(input, text),
    machineSerial: serial,
    interventionDate: todayDateLabel(),
    type: detectType(text),
    outcome: detectOutcome(text),
    hours: detectHours(text),
    summary:
      firstSentence(fromNotes.rest) ||
      firstSentence(customerFeedback) ||
      `Intervento su ${detectMachine(input, text)} — da completare`,
    workPerformed,
    partsUsed: detectParts(text, serial),
    customerFeedback: customerFeedback || undefined,
    customerSentiment: detectSentiment(customerFeedback),
    customerRequests: detectRequests(customerFeedback),
  };
}
