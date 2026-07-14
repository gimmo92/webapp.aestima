import type { KnowledgeEntry } from "./knowledgeTypes";

// Ricerca euristica nella KB lato server (in produzione: embedding / vector search).

const TROUBLESHOOTING_HINTS = [
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
];

export function isTroubleshootingQuery(text: string): boolean {
  const q = text.toLowerCase();
  return TROUBLESHOOTING_HINTS.some((h) => q.includes(h));
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

  if (entry.machineModel.toLowerCase().includes(query.toLowerCase().slice(0, 12)))
    score += 3;
  if (entry.machineSerial && query.toLowerCase().includes(entry.machineSerial.toLowerCase()))
    score += 5;

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
  if (!isTroubleshootingQuery(combined) && knowledgeBase.length === 0) return [];

  const scored = knowledgeBase
    .map((entry) => ({ entry, score: scoreEntry(entry, combined) }))
    .filter((x) => x.score >= 4)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map((x) => x.entry);
}

export function formatKbCandidatesForPrompt(
  candidates: KnowledgeEntry[]
): string {
  if (candidates.length === 0) {
    return "## RICERCA AUTOMATICA KB\nNessuna corrispondenza forte rilevata nel messaggio. Cerca comunque nella KB completa; se non trovi, comunica che la ricerca non ha dato risultati e proponi ticket.";
  }
  const lines = candidates.map(
    (e) =>
      `- ${e.id}: ${e.symptom.slice(0, 120)}… (frequenza ${e.frequency}×)`
  );
  return `## RICERCA AUTOMATICA KB\nCorrispondenze probabili per il problema descritto:\n${lines.join("\n")}\nSe pertinente, usa una di queste voci, imposta kbMatch con l'id corretto e cita la referenza nel messaggio.`;
}
