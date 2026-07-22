import { MACHINES } from "./mockData";

// Anagrafica macchine / KB statica per chat assistenza.
// Allineata al parco Vallmec (dummy data demo) via MACHINES.

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

export const SERVICE_MACHINES: ServiceMachine[] = MACHINES.map((m) => ({
  id: `svc-${m.serial}`,
  model: m.model,
  serial: m.serial,
  year: m.year,
  category: m.category,
  variant: "rev.C",
  parts: m.bom.map((p) => ({
    code: p.code,
    description: p.description,
    price: p.listPrice,
    stock: p.stock,
    leadTimeDays: p.leadTimeDays,
    keywords: p.keywords,
  })),
}));

/** KB statica chat — allineata a Listino / Catalogo VLM e Manuale (knowledgeData). */
export const TROUBLESHOOTING_KB: TroubleshootingCase[] = [
  {
    id: "kb-vlm-001",
    machineRef: "VLM-2200",
    symptom:
      "Cinghia gruppo spinta salta i denti / rumore metallico in inserimento",
    solution:
      "Verificare usura cinghia AT10 L=2250 e allineamento pulegge. Sostituire con VLM-400-009/2 (non /1 da 1950). Ritensionare secondo Catalogo VLM-2200.",
    tags: ["cinghia", "spinta", "at10", "rumore"],
  },
  {
    id: "kb-vlm-002",
    machineRef: "VLM-2200",
    symptom: "Ventose non tengono il fustellato / cartone cade in formazione",
    solution:
      "Sostituire ventose soffietto D.50 NBR (VLM-300-004) ogni ~2000 h. Controllare generatore di vuoto VLM-300-005. Non usare VLM-300-004-SI (obsoleta).",
    tags: ["ventosa", "vuoto", "fustellato", "formazione"],
  },
  {
    id: "kb-vlm-003",
    machineRef: "VLM-2200",
    symptom: "Fotocellula presenza prodotto non rileva i cartoni in ingresso",
    solution:
      "Pulire ottica, verificare allineamento e sostituire E3Z-D62 (VLM-200-040) se LED non segnala. Controllare ingresso PLC.",
    tags: ["fotocellula", "e3z", "alimentazione"],
  },
  {
    id: "kb-vlm-004",
    machineRef: "VLM-2200",
    symptom: "Sensore finecorsa slitta / asse spinta non letto dal PLC",
    solution:
      "Verificare distanza di intervento. Sostituire VLM-400-030 (Pepperl+Fuchs NBB4-12GM50-E2).",
    tags: ["finecorsa", "sensore", "m12", "plc"],
  },
  {
    id: "kb-vlm-005",
    machineRef: "VLM-2200",
    symptom: "Tappeto modulare nastro alimentazione usurato",
    solution:
      "Quotare VLM-200-002 al metro (Intralox 900 SERIES, largh. 300). Distinta ~24 m. LT 30 gg.",
    tags: ["tappeto", "alimentazione", "intralox"],
  },
  {
    id: "kb-vlm-006",
    machineRef: "VLM-1800",
    symptom: "Cinghia gruppo spinta rotta su VLM 1800",
    solution:
      "Usare VLM-400-009/1 (AT10 L=1950 rinforzata), non la /2 da 2250 del 2200. VLM-400-009 è fuori produzione.",
    tags: ["cinghia", "1950", "vlm-1800"],
  },
  {
    id: "kb-vlm-007",
    machineRef: "VLM-2200",
    symptom: "Serratura porta protezione non dà consenso",
    solution:
      "Sostituire solo VLM-100-031 (Schneider XCSDMR79M12). Componente di sicurezza: niente equivalenti.",
    tags: ["sicurezza", "serratura", "rfid"],
  },
];

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

  return `${buildMachinesContext()}\n\n=== CASI RISOLTI (KB STATICA) ===\n${kbBlock}`;
}
