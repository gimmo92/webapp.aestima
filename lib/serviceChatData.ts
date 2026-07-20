// Anagrafica macchine / KB statica per chat assistenza.
// In produzione: catalogo ERP/PLM e storico interventi.

export interface ServiceSparePart {
  code: string;
  description: string;
  /** Prezzo di listino EUR */
  price: number;
  /** Giacenza a magazzino (0 = da ordinare) */
  stock: number;
  /** Giorni lavorativi se stock = 0 */
  leadTimeDays: number;
  /** Sinonimi con cui il cliente potrebbe descrivere il pezzo */
  keywords: string[];
}

export interface ServiceMachine {
  id: string;
  model: string;
  /** Matricola univoca */
  serial: string;
  year: number;
  category: string;
  /** Variante/versione — utile per disambiguare modelli omonimi */
  variant: string;
  parts: ServiceSparePart[];
}

export interface TroubleshootingCase {
  id: string;
  /** Modello o matricola di riferimento */
  machineRef: string;
  /** Sintomo descritto dal cliente / operatore */
  symptom: string;
  /** Soluzione applicata e verificata */
  solution: string;
  /** Tag per ricerca semantica */
  tags: string[];
}

export const SERVICE_MACHINES: ServiceMachine[] = [];
export const TROUBLESHOOTING_KB: TroubleshootingCase[] = [];

/** Serializza anagrafica macchine per il system prompt dell'agente. */
export function buildMachinesContext(): string {
  if (SERVICE_MACHINES.length === 0) {
    return "=== ANAGRAFICA MACCHINE E DISTINTE ===\n(Nessuna macchina in anagrafica)";
  }

  const machinesBlock = SERVICE_MACHINES.map((m) => {
    const partsList = m.parts
      .map((p) => {
        const avail =
          p.stock > 0
            ? `disponibile (${p.stock} pz)`
            : `da ordinare (${p.leadTimeDays} gg)`;
        return `    - ${p.code}: ${p.description} | €${p.price} | ${avail}`;
      })
      .join("\n");
    return [
      `Macchina: ${m.model}`,
      `  Matricola: ${m.serial}`,
      `  Anno: ${m.year} | Categoria: ${m.category}`,
      `  Variante: ${m.variant}`,
      `  Distinta base:`,
      partsList,
    ].join("\n");
  }).join("\n\n");

  return `=== ANAGRAFICA MACCHINE E DISTINTE ===\n${machinesBlock}`;
}

/** @deprecated Usare buildMachinesContext + formatKnowledgeForPrompt (KB dinamica). */
export function buildServiceContext(): string {
  const kbBlock =
    TROUBLESHOOTING_KB.length === 0
      ? "(Nessun caso in knowledge base statica)"
      : TROUBLESHOOTING_KB.map(
          (c) =>
            `[${c.id}] ${c.machineRef}\n  Problema: ${c.symptom}\n  Soluzione: ${c.solution}`
        ).join("\n\n");

  return `${buildMachinesContext()}\n\n=== BASE DI CONOSCENZA TROUBLESHOOTING (statica legacy) ===\n${kbBlock}`;
}
