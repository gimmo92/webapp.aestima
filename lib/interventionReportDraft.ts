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

export interface ReportDraftInput {
  technicianName: string;
  customerCompany?: string;
  /** Modello/matricola già noti dalla scheda contatto. */
  machineHint?: string;
  /** Note dettate o scritte dall'operatore. */
  notes?: string;
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
  // Le fonti restano elencate a parte sul rapporto: nei lavori eseguiti
  // finiscono le note dell'operatore, o in mancanza le trascrizioni.
  const workPerformed =
    input.notes?.trim() ||
    text ||
    `Intervento riferito da ${input.technicianName} via WhatsApp. Dettagli da completare.`;
  const serial = detectSerial(text);

  return {
    machineModel: detectMachine(input, text),
    machineSerial: serial,
    interventionDate: todayDateLabel(),
    type: detectType(text),
    outcome: detectOutcome(text),
    hours: detectHours(text),
    summary:
      firstSentence(workPerformed) ||
      `Intervento su ${detectMachine(input, text)} — da completare`,
    workPerformed,
    partsUsed: detectParts(text, serial),
  };
}
