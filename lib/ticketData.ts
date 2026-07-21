import type {
  ServiceTicketRecord,
  TicketStatusConfig,
} from "./ticketTypes";

// =============================================================
// DATI MOCK — ticket service
// Sostituire in produzione con API ticketing del cliente.
// =============================================================

export const TICKET_STATUSES: TicketStatusConfig[] = [
  { id: "aperto", label: "Aperto", color: "#3b82f6" },
  { id: "assegnato", label: "Assegnato", color: "#8b5cf6" },
  { id: "in_lavorazione", label: "In lavorazione", color: "#f59e0b" },
  { id: "in_attesa_cliente", label: "In attesa cliente", color: "#06b6d4" },
  { id: "risolto", label: "Risolto", color: "#22c55e" },
  { id: "chiuso", label: "Chiuso", color: "#9fb0c3" },
];

export const TICKET_STATUS_BY_ID = Object.fromEntries(
  TICKET_STATUSES.map((s) => [s.id, s])
);

export const TICKET_SOURCE_LABELS: Record<
  ServiceTicketRecord["source"],
  string
> = {
  chat_ai: "Chat AI",
  manuale: "Manuale",
  inbox: "Inbox",
};

export const TICKET_CATEGORY_LABELS: Record<
  ServiceTicketRecord["category"],
  string
> = {
  ricambio: "Ricambio",
  troubleshooting: "Troubleshooting",
  altro: "Altro",
};

export function newTicketId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SRV-${n}`;
}

export const MOCK_TICKETS: ServiceTicketRecord[] = [
  {
    id: "SRV-2847",
    status: "in_lavorazione",
    priority: "alta",
    source: "chat_ai",
    category: "ricambio",
    summary: "Cinghia AT10 gruppo spinta — VLM-2200 1389",
    description:
      "Cliente Salumificio Ponte Nuovo: cinghia dentata gruppo spinta usurata su VLM-2200 matr. 1389. Urgente, linea quasi ferma.",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1389",
    assignedTechnicianId: "tech-001",
    createdLabel: "09:12",
    createdFull: "Oggi, 09:12",
    updatedFull: "Oggi, 10:05",
    internalNotes: "Codice listino VLM-400-009/2 — verificare giacenza magazzino.",
  },
  {
    id: "SRV-2751",
    status: "aperto",
    priority: "normale",
    source: "manuale",
    category: "troubleshooting",
    summary: "Ventose non tengono fustellati — matr. 1418",
    description:
      "Dolciaria Fontanini: ventose soffietto D.50 del gruppo formazione non trattengono i cartoni. Possibile usura o calo vuoto.",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1418",
    createdLabel: "Ieri",
    createdFull: "Ieri, 16:40",
    updatedFull: "Ieri, 16:40",
  },
  {
    id: "SRV-2699",
    status: "risolto",
    priority: "normale",
    source: "chat_ai",
    category: "troubleshooting",
    summary: "Fotocellula presenza prodotto — VLM-2200 1412",
    description:
      "Escalation da chat assistenza: fotocellula ingresso non rileva i cartoni su Nutrilab matr. 1412.",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1412",
    assignedTechnicianId: "tech-002",
    createdLabel: "12 mar",
    createdFull: "12 mar, 11:20",
    updatedFull: "13 mar, 09:15",
    internalNotes: "Sostituita E3Z-D62 (VLM-200-040). Chiuso.",
    solution:
      "Sostituita fotocellula VLM-200-040, riallineata ottica e verificato segnale PLC. Rilevamento prodotto ok.",
  },
];
