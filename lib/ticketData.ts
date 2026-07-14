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
    summary: "Ricambio non in distinta — fresatrice FZ-500",
    description:
      "Cliente chiede filtro olio elettromandrino per fresatrice FZ-500 matr. FR-3092. Pezzo non presente in anagrafica demo.",
    machineModel: "Fresatrice FZ-500",
    machineSerial: "FR-3092",
    assignedTechnicianId: "tech-001",
    createdLabel: "09:12",
    createdFull: "Oggi, 09:12",
    updatedFull: "Oggi, 10:05",
    internalNotes: "Verificare con ufficio tecnico codice OEM mandrino ISO40.",
  },
  {
    id: "SRV-2751",
    status: "aperto",
    priority: "normale",
    source: "manuale",
    category: "troubleshooting",
    summary: "Allarme pressione idraulica intermittente",
    description:
      "Impianto IDC 114 TCZ IDC-114-112 segnala calo pressione ogni 40 cicli. Cliente Meccanica Bassano.",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-112",
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
    summary: "Perdita olio mandrino RX-400",
    description:
      "Escalation da chat assistenza: perdita olio sotto testa rettifica. Soluzione KB non sufficiente — richiesta ispezione accoppiamento.",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    assignedTechnicianId: "tech-002",
    createdLabel: "12 mar",
    createdFull: "12 mar, 11:20",
    updatedFull: "13 mar, 09:15",
    internalNotes: "Sostituita tenuta SL-2201-VT + verifica albero OK. Chiuso.",
  },
];
