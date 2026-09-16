// =============================================================
// Archivio rapporti d'intervento generati dalle chat.
// Persistenza demo su localStorage (come le bozze preventivo e
// il mirror conversazioni): nessuna migrazione DB necessaria.
// =============================================================

import type {
  ReportDraft,
  ReportSourceInput,
} from "./interventionReportDraft";
import type { InterventionReport } from "./technicianTypes";

const STORAGE_KEY = "aftercore:intervention-reports:v1";
const CHANGE_EVENT = "aftercore:reports-changed";

export interface InterventionReportRecord extends ReportDraft {
  id: string;
  reportNumber: string;
  createdAtIso: string;
  channel: "whatsapp";
  technicianName: string;
  technicianPhone?: string;
  customerCompany?: string;
  sources: ReportSourceInput[];
  /** Come è stata prodotta la bozza salvata. */
  aiSource: "anthropic" | "fallback";
  chatId?: string;
  chatName?: string;
}

const DEMO_REPORTS: InterventionReportRecord[] = [
  {
    id: "rep-demo-002",
    reportNumber: "RAP-2026-0148",
    createdAtIso: "2026-09-09T16:45:00.000Z",
    channel: "whatsapp",
    technicianName: "Giorgio Salvi",
    technicianPhone: "+39 333 908 1145",
    customerCompany: "Salvi Impianti",
    machineModel: "Pressa PR-12",
    machineSerial: "PR12-0094",
    interventionDate: "09/09/2026",
    type: "sostituzione",
    outcome: "completato",
    hours: 3,
    summary: "Sostituzione valvola proporzionale e ciclo di prova sulla pressa PR-12",
    workPerformed:
      "Smontata la valvola proporzionale in blocco sul gruppo idraulico, montato il ricambio nuovo e rifatto lo spurgo del circuito. Eseguito ciclo di prova a vuoto e in carico: pressioni nei limiti, nessuna perdita. Pulito il filtro in aspirazione.",
    partsUsed: ["VLV-PROP-4WRE"],
    customerFeedback:
      "Il cliente è soddisfatto della rapidità, ma segnala che la pressa resta ferma troppo a lungo in attesa dei ricambi e chiede di tenerne uno in conto deposito.",
    customerSentiment: "positivo",
    customerRequests: ["Valvola proporzionale in conto deposito presso il sito"],
    sources: [
      {
        kind: "audio",
        label: "Vocale 0:38 — Giorgio Salvi",
        excerpt:
          "Ho sostituito la valvola proporzionale, rifatto lo spurgo e provato il ciclo: la pressa è ripartita regolare.",
      },
      {
        kind: "documento",
        label: "RAP-2026-0142-pressa-PR12.pdf",
      },
    ],
    aiSource: "fallback",
    chatId: "wa-salvi",
    chatName: "Giorgio Salvi",
  },
  {
    id: "rep-demo-001",
    reportNumber: "RAP-2026-0147",
    createdAtIso: "2026-09-14T11:50:00.000Z",
    channel: "whatsapp",
    technicianName: "Matteo Greco",
    technicianPhone: "+39 366 445 0921",
    customerCompany: "CEDI Bologna",
    machineModel: "Trasloelevatore T2",
    machineSerial: "T2-corsia-4",
    interventionDate: "14/09/2026",
    type: "verifica",
    outcome: "parziale",
    hours: 1.5,
    summary: "Pulizia e riallineamento fotocellula di corsia sul trasloelevatore T2",
    workPerformed:
      "Pulito riflettore e lente della fotocellula di corsia 4, riallineato il sensore sul supporto e verificato il riferimento di posizionamento su tre cicli completi. L'allarme non si è più presentato durante la prova.",
    partsUsed: [],
    followUp:
      "Se l'allarme di posizionamento si ripresenta, sostituire la fotocellula: ricambio da ordinare.",
    customerFeedback:
      "Il capoturno si lamenta dei fermi ripetuti sulla corsia 4 e dice che il pulpito di comando è scomodo da raggiungere durante i reset. Vorrebbe valutare un kit di comando remoto.",
    customerSentiment: "critico",
    customerRequests: ["Preventivo per kit di comando remoto sulla corsia 4"],
    sources: [
      {
        kind: "chat",
        label: "Messaggi chat — Matteo Greco",
        excerpt:
          "Il trasloelevatore T2 dà allarme di posizionamento: la fotocellula di corsia perde il riferimento. Pulita e riallineata, per ora regge.",
      },
    ],
    aiSource: "fallback",
    chatId: "wa-greco",
    chatName: "Matteo Greco",
  },
];

// Copia in memoria: se il browser blocca la memoria locale (navigazione
// privata, quota piena) la scheda corrente resta comunque coerente.
let cache: InterventionReportRecord[] | null = null;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readStored(): InterventionReportRecord[] | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as InterventionReportRecord[]) : null;
  } catch {
    return null;
  }
}

/** Restituisce false se la persistenza non è andata a buon fine. */
function write(records: InterventionReportRecord[]): boolean {
  cache = records;
  let persisted = false;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      persisted = true;
    } catch {
      persisted = false;
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }
  return persisted;
}

/** Rapporti dal più recente al più vecchio. Al primo accesso semina i demo. */
export function listReports(): InterventionReportRecord[] {
  const stored = readStored();
  if (stored) {
    cache = stored;
    return stored;
  }
  if (cache) return cache;
  write(DEMO_REPORTS);
  return DEMO_REPORTS;
}

export function saveReport(record: InterventionReportRecord): boolean {
  const current = listReports();
  return write([record, ...current.filter((item) => item.id !== record.id)]);
}

/** Prossimo numero progressivo nel formato RAP-<anno>-<0000>. */
export function nextReportNumber(
  existing: InterventionReportRecord[] = listReports()
): string {
  const year = new Date().getFullYear();
  const prefix = `RAP-${year}-`;
  const highest = existing.reduce((max, record) => {
    if (!record.reportNumber.startsWith(prefix)) return max;
    const value = Number(record.reportNumber.slice(prefix.length));
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(4, "0")}`;
}

/** Notifica i cambiamenti, anche tra tab diverse dello stesso browser. */
export function subscribeReports(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Adatta il record al tipo usato dal generatore PDF esistente. */
export function toInterventionReport(
  record: InterventionReportRecord
): InterventionReport {
  return {
    id: record.id,
    reportNumber: record.reportNumber,
    machineSerial: record.machineSerial ?? "n/d",
    machineModel: record.machineModel,
    technicianId: record.chatId ?? record.id,
    interventionDate: record.interventionDate,
    interventionDateFull: record.interventionDate,
    type: record.type,
    outcome: record.outcome,
    hours: record.hours,
    summary: record.summary,
    workPerformed: [
      record.workPerformed,
      record.customerFeedback
        ? `Feedback del cliente: ${record.customerFeedback}`
        : "",
      record.customerRequests?.length
        ? `Richieste del cliente: ${record.customerRequests.join("; ")}`
        : "",
      record.followUp ? `Follow-up: ${record.followUp}` : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
    partsUsed: record.partsUsed,
    customerCompany: record.customerCompany,
  };
}
