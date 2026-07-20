import type {
  ServiceTicketRecord,
  TicketStatusConfig,
} from "./ticketTypes";

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

export const MOCK_TICKETS: ServiceTicketRecord[] = [];
