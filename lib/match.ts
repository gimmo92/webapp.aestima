import { MACHINES } from "./mockData";
import type {
  AnalysisResult,
  Availability,
  BomComponent,
  Machine,
  MatchResult,
} from "./types";

// =============================================================
// MATCHER — collega l'output dell'agente ai dati mock (distinte)
// -------------------------------------------------------------
// In produzione questa logica interrogherebbe l'ERP/PLM.
// Qui usa il numero di serie per trovare la macchina e le
// `keywords` della BOM per identificare il componente.
// =============================================================

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // rimuove accenti
}

/** Trova la macchina dal numero di serie (match esatto o parziale). */
function findMachine(serial: string): Machine | null {
  const s = normalize(serial).replace(/\s+/g, "");
  if (!s) return null;
  return (
    MACHINES.find((m) => normalize(m.serial).replace(/\s+/g, "") === s) ??
    MACHINES.find((m) => s.includes(normalize(m.serial).replace(/\s+/g, ""))) ??
    null
  );
}

/**
 * Identifica il componente nella distinta della macchina a partire
 * dalla descrizione in linguaggio naturale dell'agente.
 * Assegna un punteggio in base alle keyword trovate.
 */
function findComponent(
  machine: Machine,
  componentText: string
): BomComponent | null {
  const text = normalize(componentText);
  if (!text) return null;

  let best: BomComponent | null = null;
  let bestScore = 0;

  for (const comp of machine.bom) {
    let score = 0;
    for (const kw of comp.keywords) {
      if (text.includes(normalize(kw))) score += kw.length; // parole più specifiche pesano di più
    }
    // bonus se compare parte della descrizione tecnica
    for (const word of normalize(comp.description).split(/\W+/)) {
      if (word.length > 3 && text.includes(word)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = comp;
    }
  }
  return best;
}

function availabilityOf(component: BomComponent): Availability {
  return component.stock > 0 ? "disponibile" : "da_ordinare";
}

/** Esegue il match completo: macchina + componente + disponibilità. */
export function matchAnalysisToData(analysis: AnalysisResult): MatchResult {
  const machine = findMachine(analysis.numero_serie);
  if (!machine) {
    return { machine: null, component: null, availability: null };
  }
  const component = findComponent(machine, analysis.componente_identificato);
  return {
    machine,
    component,
    availability: component ? availabilityOf(component) : null,
  };
}
