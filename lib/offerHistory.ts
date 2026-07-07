import { computeOffer } from "./inboxOffers";
import type { PartRequest, RequestStatus } from "./inboxTypes";

// =============================================================
// STORICO OFFERTE — demo
// -------------------------------------------------------------
// Unisce offerte chiuse/archiviate (mock statico) con quelle
// derivate dalle richieste inbox in stati inviata / vinta / persa.
// =============================================================

export type OfferOutcome = "accettata" | "rifiutata" | "in_attesa";

export interface OfferHistoryRecord {
  id: string;
  quoteNumber: string;
  sentDate: string;
  sentDateSort: string;
  closedDate?: string;
  company: string;
  contact: string;
  componentTitle: string;
  componentCode: string;
  machine: string;
  serial: string;
  amount: number;
  outcome: OfferOutcome;
  /** Se collegata a una richiesta inbox attiva. */
  requestId?: string;
}

const HISTORY_STATUSES: RequestStatus[] = [
  "inviata",
  "attesa_fornitore",
  "vinta",
  "persa",
];

export const OUTCOME_LABELS: Record<
  OfferOutcome,
  { label: string; color: string }
> = {
  accettata: { label: "Accettata", color: "#22c55e" },
  rifiutata: { label: "Rifiutata", color: "#ef4444" },
  in_attesa: { label: "In attesa", color: "#3b82f6" },
};

/** Offerte concluse o inviate in mesi precedenti (solo demo). */
const STATIC_OFFER_HISTORY: OfferHistoryRecord[] = [
  {
    id: "hist-001",
    quoteNumber: "PREV-2026-0098",
    sentDate: "12 maggio 2026",
    sentDateSort: "2026-05-12",
    closedDate: "18 maggio 2026",
    company: "Bergamo Lift S.r.l.",
    contact: "Marco De Santis",
    componentTitle: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G (TACCHE)",
    componentCode: "3381200010",
    machine: "Impianto IDC 114 TCZ",
    serial: "IDC-114-062",
    amount: 2847.5,
    outcome: "accettata",
  },
  {
    id: "hist-002",
    quoteNumber: "PREV-2026-0071",
    sentDate: "28 aprile 2026",
    sentDateSort: "2026-04-28",
    closedDate: "5 maggio 2026",
    company: "Officine Bianchi S.p.A.",
    contact: "Laura Bianchi",
    componentTitle: "Pompa refrigerante 0,75 kW 400V trifase",
    componentCode: "PM-5502-EL",
    machine: "Tornio CNC TC-220",
    serial: "TC-7788",
    amount: 530.7,
    outcome: "accettata",
  },
  {
    id: "hist-003",
    quoteNumber: "PREV-2026-0044",
    sentDate: "15 aprile 2026",
    sentDateSort: "2026-04-15",
    closedDate: "22 aprile 2026",
    company: "Rossi Meccanica S.r.l.",
    contact: "Marco Rossi",
    componentTitle: "Anello di tenuta mandrino (guarnizione Viton Ø45)",
    componentCode: "SL-2201-VT",
    machine: "Rettificatrice RX-400",
    serial: "MX-4521",
    amount: 168.19,
    outcome: "rifiutata",
  },
  {
    id: "hist-004",
    quoteNumber: "PREV-2026-0032",
    sentDate: "3 aprile 2026",
    sentDateSort: "2026-04-03",
    closedDate: "10 aprile 2026",
    company: "Epsilon Industrie",
    contact: "Andrea Conti",
    componentTitle: "Sensore induttivo di finecorsa asse X (M12 PNP)",
    componentCode: "SN-3310-IX",
    machine: "Tornio CNC TC-220",
    serial: "TC-7788",
    amount: 95.16,
    outcome: "accettata",
  },
  {
    id: "hist-005",
    quoteNumber: "PREV-2026-0019",
    sentDate: "18 marzo 2026",
    sentDateSort: "2026-03-18",
    closedDate: "25 marzo 2026",
    company: "Gamma S.r.l.",
    contact: "Giuseppe Verdi",
    componentTitle: "RUOTA TRAINO 76 TC/114 TCZ 12 PASSI C40 TEMPRATA",
    componentCode: "1381400061_F",
    machine: "Impianto IDC 114 TCZ",
    serial: "IDC-114-051",
    amount: 4120.0,
    outcome: "rifiutata",
  },
];

function outcomeFromStatus(status: RequestStatus): OfferOutcome {
  if (status === "vinta") return "accettata";
  if (status === "persa") return "rifiutata";
  return "in_attesa";
}

/** Date demo per richieste live (invio / chiusura). */
function datesForRequest(r: PartRequest): {
  sentDate: string;
  sentDateSort: string;
  closedDate?: string;
} {
  const map: Record<string, { sent: string; sort: string; closed?: string }> = {
    "req-003": { sent: "6 luglio 2026", sort: "2026-07-06" },
    "req-006": { sent: "4 luglio 2026", sort: "2026-07-04" },
    "req-007": {
      sent: "20 giugno 2026",
      sort: "2026-06-20",
      closed: "26 giugno 2026",
    },
    "req-008": {
      sent: "18 giugno 2026",
      sort: "2026-06-18",
      closed: "24 giugno 2026",
    },
  };
  const d = map[r.id];
  if (d) {
    return {
      sentDate: d.sent,
      sentDateSort: d.sort,
      closedDate: d.closed,
    };
  }
  return {
    sentDate: r.receivedFull,
    sentDateSort: "2026-07-01",
    closedDate:
      r.status === "vinta" || r.status === "persa" ? r.receivedFull : undefined,
  };
}

function recordFromRequest(r: PartRequest): OfferHistoryRecord | null {
  const offer = computeOffer(r);
  if (!offer) return null;
  const dates = datesForRequest(r);
  return {
    id: r.id,
    requestId: r.id,
    quoteNumber: offer.quote.number,
    sentDate: dates.sentDate,
    sentDateSort: dates.sentDateSort,
    closedDate: dates.closedDate,
    company: r.company,
    contact: r.from,
    componentTitle: offer.quote.componentTitle,
    componentCode: offer.component.code,
    machine: offer.machine.model,
    serial: offer.machine.serial,
    amount: offer.quote.total,
    outcome: outcomeFromStatus(r.status),
  };
}

/** Elenco completo storico offerte, più recenti per prime. */
export function buildOfferHistory(requests: PartRequest[]): OfferHistoryRecord[] {
  const live = requests
    .filter((r) => HISTORY_STATUSES.includes(r.status))
    .map(recordFromRequest)
    .filter((r): r is OfferHistoryRecord => r !== null);

  const liveRequestIds = new Set(live.map((r) => r.requestId).filter(Boolean));
  const archived = STATIC_OFFER_HISTORY.filter(
    (h) => !h.requestId || !liveRequestIds.has(h.requestId)
  );

  return [...live, ...archived].sort((a, b) =>
    b.sentDateSort.localeCompare(a.sentDateSort)
  );
}
