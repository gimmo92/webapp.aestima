import { MACHINES } from "./mockData";
import type { AnalysisResult, Urgency } from "./types";

// =============================================================
// ANALISI EURISTICA LOCALE (FALLBACK)
// -------------------------------------------------------------
// Usata quando ANTHROPIC_API_KEY non è impostata: estrae in modo
// semplice numero di serie, componente e urgenza dal testo, così
// la demo funziona comunque senza chiamare Claude.
// =============================================================

const URGENCY_WORDS = [
  "urgent",
  "urgenza",
  "subito",
  "immediat",
  "fermo macchina",
  "fermo",
  "asap",
  "prima possibile",
  "bloccat",
];

/** Estrae il primo numero di serie riconoscibile (es. MX-4521). */
function extractSerial(text: string): string {
  // Prova prima con le matricole note (più affidabile per la demo).
  for (const m of MACHINES) {
    if (text.toUpperCase().includes(m.serial.toUpperCase())) return m.serial;
  }
  // Altrimenti pattern generico tipo "AB-1234".
  const match = text.match(/\b[A-Z]{2,4}[-\s]?\d{3,5}\b/i);
  return match ? match[0].toUpperCase().replace(/\s/g, "-") : "";
}

/** Descrive il componente citato in linguaggio naturale. */
function extractComponent(text: string): string {
  const t = text.toLowerCase();
  const candidates = [
    "curva di rinvio",
    "curva rinvio",
    "assieme fune",
    "ruota traino",
    "ruota di traino",
    "corona traino",
    "perno curva",
    "componente di tenuta",
    "tenuta",
    "guarnizione",
    "cuscinetto",
    "cinghia",
    "pompa",
    "sensore",
    "finecorsa",
    "mandrino",
    "elettromandrino",
    "filtro",
    "refrigerante",
    "fune",
    "cavo",
  ];
  const found = candidates.find((c) => t.includes(c));
  return found ?? "componente non specificato";
}

function extractUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  return URGENCY_WORDS.some((w) => t.includes(w)) ? "alta" : "normale";
}

/** Analisi mock completa a partire dal testo grezzo della richiesta. */
export function mockAnalyze(request: string): AnalysisResult {
  const numero_serie = extractSerial(request);
  const machine = MACHINES.find(
    (m) => m.serial.toUpperCase() === numero_serie.toUpperCase()
  );
  const componente_identificato = extractComponent(request);
  const urgenza = extractUrgency(request);

  return {
    macchina: machine ? `${machine.model} (${machine.year})` : "Da identificare",
    numero_serie,
    componente_identificato,
    urgenza,
    note:
      "Analisi generata in modalità demo locale (nessuna chiave API configurata).",
    source: "mock",
  };
}
