import type {
  Supplier,
  SupplierRequest,
  SupplierRequestStatusConfig,
} from "./supplierTypes";

// =============================================================
// DATI MOCK — fornitori e richieste inviate
// -------------------------------------------------------------
// In PRODUZIONE l'anagrafica fornitori verrebbe da ERP/CRM e le
// richieste da un modulo acquisti collegato alla casella email.
// =============================================================

export const SUPPLIER_REQUEST_STATUSES: SupplierRequestStatusConfig[] = [
  { id: "bozza", label: "Bozza", color: "#9fb0c3" },
  { id: "inviata", label: "Inviata", color: "#3b82f6" },
  { id: "in_attesa", label: "In attesa risposta", color: "#f59e0b" },
  { id: "risposta_ricevuta", label: "Risposta ricevuta", color: "#06b6d4" },
  { id: "confermata", label: "Confermata", color: "#22c55e" },
  { id: "annullata", label: "Annullata", color: "#ef4444" },
];

export const SUPPLIER_STATUS_BY_ID = Object.fromEntries(
  SUPPLIER_REQUEST_STATUSES.map((s) => [s.id, s])
);

export const MOCK_SUPPLIERS: Supplier[] = [
  {
    id: "sup-001",
    name: "Meccanica Nord S.r.l.",
    email: "ordini@meccanicanord.it",
    contact: "Marco Ferretti",
    categories: ["Trasmissioni", "Cinghie", "Pulegge"],
    notes: "Lead time medio 5–7 gg",
  },
  {
    id: "sup-002",
    name: "Pneumatica Industriale SpA",
    email: "acquisti@pneumaticaind.it",
    contact: "Laura Santi",
    categories: ["Pneumatica", "Valvole", "Attuatori"],
  },
  {
    id: "sup-003",
    name: "Cuscinetti & Componenti S.r.l.",
    email: "preventivi@cuscinetti-componenti.it",
    contact: "Giuseppe Riva",
    categories: ["Cuscinetti", "Supporti", "Guarnizioni"],
  },
  {
    id: "sup-004",
    name: "Idraulica Veneta",
    email: "vendite@idraulicaveneta.com",
    contact: "Silvia Conti",
    categories: ["Idraulica", "Pompe", "Refrigerante"],
  },
  {
    id: "sup-005",
    name: "Elettromeccanica Delta",
    email: "ufficio.tecnico@elettromecdelta.it",
    contact: "Andrea Bassi",
    categories: ["Sensori", "Elettronica", "Finecorsa"],
  },
];

// Richieste già inviate (collegate a req-003: lame / kit VLM-2200 1475).
export const MOCK_SUPPLIER_REQUESTS: SupplierRequest[] = [
  {
    id: "sr-001",
    partRequestId: "req-003",
    supplierId: "sup-001",
    status: "in_attesa",
    subject: "Richiesta disponibilità — VLM-500-011",
    body:
      "Richiediamo disponibilità e lead time per lama di taglio nastro, cod. VLM-500-011, applicazione Incartonatrice VLM-2200 matr. 1475, qty 2.",
    componentCode: "VLM-500-011",
    componentDescription: "Lama di taglio nastro",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1475",
    sentLabel: "ieri",
    sentFull: "Ieri, 17:10",
  },
  {
    id: "sr-002",
    partRequestId: "req-003",
    supplierId: "sup-003",
    status: "risposta_ricevuta",
    subject: "Richiesta disponibilità — VLM-KIT-2000H",
    body:
      "Richiediamo disponibilità e lead time per kit manutenzione 2.000 ore VLM 2200, cod. VLM-KIT-2000H, applicazione Incartonatrice VLM-2200 matr. 1475, qty 1.",
    componentCode: "VLM-KIT-2000H",
    componentDescription: "Kit manutenzione 2.000 ore VLM 2200",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1475",
    sentLabel: "ieri",
    sentFull: "Ieri, 17:10",
  },
];

/** Genera un id univoco per un nuovo fornitore. */
export function newSupplierId(): string {
  return `sup-${Date.now()}`;
}

/** Genera un id univoco per una richiesta fornitore. */
export function newSupplierRequestId(): string {
  return `sr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
