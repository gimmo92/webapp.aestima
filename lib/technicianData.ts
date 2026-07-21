import type {
  InterventionCapability,
  InterventionReport,
  InterventionReportOutcomeConfig,
  InterventionReportTypeConfig,
  Technician,
  TechnicianAssignment,
  TechnicianAssignmentStatusConfig,
} from "./technicianTypes";

// =============================================================
// DATI MOCK — tecnici di campo e assegnazioni intervento
// =============================================================

export const INTERVENTION_CAPABILITIES: InterventionCapability[] = [
  { id: "sollevamento", label: "Impianti di sollevamento", color: "#3b82f6" },
  { id: "montaggio", label: "Montaggio meccanico", color: "#06b6d4" },
  { id: "rettifica", label: "Rettificatrici", color: "#a855f7" },
  { id: "cnc", label: "Torni e CNC", color: "#22c55e" },
  { id: "fresatura", label: "Centri di fresatura", color: "#f59e0b" },
  { id: "elettrica", label: "Elettrica / automazione", color: "#ec4899" },
  { id: "idraulica", label: "Idraulica e pneumatica", color: "#6366f1" },
];

export const CAPABILITY_BY_ID = Object.fromEntries(
  INTERVENTION_CAPABILITIES.map((c) => [c.id, c])
);

export const TECHNICIAN_ASSIGNMENT_STATUSES: TechnicianAssignmentStatusConfig[] =
  [
    { id: "bozza", label: "Bozza", color: "#9fb0c3" },
    { id: "contattato", label: "Contattato", color: "#3b82f6" },
    { id: "disponibile", label: "Disponibile", color: "#22c55e" },
    { id: "non_disponibile", label: "Non disponibile", color: "#ef4444" },
    { id: "in_corso", label: "Intervento in corso", color: "#f59e0b" },
    { id: "completato", label: "Completato", color: "#06b6d4" },
    { id: "annullato", label: "Annullato", color: "#6b7280" },
  ];

export const TECHNICIAN_STATUS_BY_ID = Object.fromEntries(
  TECHNICIAN_ASSIGNMENT_STATUSES.map((s) => [s.id, s])
);

export const INTERVENTION_REPORT_TYPES: InterventionReportTypeConfig[] = [
  { id: "manutenzione", label: "Manutenzione", color: "#06b6d4" },
  { id: "riparazione", label: "Riparazione", color: "#f59e0b" },
  { id: "sostituzione", label: "Sostituzione ricambio", color: "#a855f7" },
  { id: "verifica", label: "Verifica / collaudo", color: "#22c55e" },
  { id: "installazione", label: "Installazione", color: "#3b82f6" },
];

export const INTERVENTION_REPORT_OUTCOMES: InterventionReportOutcomeConfig[] = [
  { id: "completato", label: "Completato", color: "#22c55e" },
  { id: "parziale", label: "Parziale", color: "#f59e0b" },
  { id: "followup", label: "Richiede follow-up", color: "#ef4444" },
];

export const REPORT_TYPE_BY_ID = Object.fromEntries(
  INTERVENTION_REPORT_TYPES.map((t) => [t.id, t])
);

export const REPORT_OUTCOME_BY_ID = Object.fromEntries(
  INTERVENTION_REPORT_OUTCOMES.map((o) => [o.id, o])
);

export const MOCK_INTERVENTION_REPORTS: InterventionReport[] = [
  {
    id: "ir-001",
    reportNumber: "RAP-2026-0142",
    machineSerial: "1389",
    machineModel: "Incartonatrice VLM-2200",
    technicianId: "tech-001",
    interventionDate: "15/03/2026",
    interventionDateFull: "15 marzo 2026 · 08:30–13:00",
    type: "sostituzione",
    outcome: "completato",
    hours: 4.5,
    summary: "Sostituzione cinghia dentata AT10 e tensionamento gruppo spinta",
    workPerformed:
      "Smontaggio cinghia AT10 usurata sul gruppo spinta, montaggio VLM-400-009/2, controllo allineamento pulegge e tensionamento. Collaudo ciclo completo incartonatrice.",
    partsUsed: ["VLM-400-009/2"],
    customerCompany: "Salumificio Ponte Nuovo S.p.A.",
    assignmentId: "ta-001",
  },
  {
    id: "ir-002",
    reportNumber: "RAP-2025-0891",
    machineSerial: "1418",
    machineModel: "Incartonatrice VLM-2200",
    technicianId: "tech-002",
    interventionDate: "22/11/2025",
    interventionDateFull: "22 novembre 2025 · 09:00–12:00",
    type: "manutenzione",
    outcome: "completato",
    hours: 3,
    summary: "Manutenzione programmata ventose e generatore vuoto",
    workPerformed:
      "Sostituzione ventose soffietto D.50 NBR, verifica tenuta vuoto e regolazione magazzino fustellati. Kit usura 2.000 h applicato.",
    partsUsed: ["VLM-300-004", "VLM-KIT-2000H"],
    customerCompany: "Dolciaria Fontanini S.r.l.",
  },
  {
    id: "ir-003",
    reportNumber: "RAP-2026-0098",
    machineSerial: "1412",
    machineModel: "Incartonatrice VLM-2200",
    technicianId: "tech-003",
    interventionDate: "04/02/2026",
    interventionDateFull: "4 febbraio 2026 · 14:00–16:00",
    type: "sostituzione",
    outcome: "completato",
    hours: 2,
    summary: "Sostituzione fotocellula presenza prodotto E3Z-D62",
    workPerformed:
      "Diagnostica ingresso prodotto, sostituzione fotocellula VLM-200-040, allineamento ottico e test PLC.",
    partsUsed: ["VLM-200-040"],
    customerCompany: "Nutrilab Integratori S.r.l.",
  },
];

export const MOCK_TECHNICIANS: Technician[] = [
  {
    id: "tech-001",
    name: "Luca Moretti",
    email: "l.moretti@aestima.demo",
    phone: "393471234567",
    capabilities: ["sollevamento", "montaggio"],
    region: "Veneto · Nord-Est",
    notes: "IDC 114 TCZ, montaggio assiemi fune e curve di rinvio",
  },
  {
    id: "tech-002",
    name: "Marco Ferretti",
    email: "m.ferretti@aestima.demo",
    phone: "393489876543",
    capabilities: ["sollevamento", "idraulica"],
    region: "Veneto · Lombardia",
  },
  {
    id: "tech-003",
    name: "Andrea Bassi",
    email: "a.bassi@aestima.demo",
    phone: "393331112233",
    capabilities: ["rettifica", "montaggio"],
    region: "Emilia-Romagna",
    notes: "Rettificatrici RX, mandrini e trasmissioni",
  },
  {
    id: "tech-004",
    name: "Silvia Conti",
    email: "s.conti@aestima.demo",
    phone: "393345678901",
    capabilities: ["cnc", "elettrica"],
    region: "Veneto · Triveneto",
    notes: "Torni TC, sensori e finecorsa",
  },
  {
    id: "tech-005",
    name: "Giuseppe Riva",
    email: "g.riva@aestima.demo",
    phone: "393356789012",
    capabilities: ["fresatura", "montaggio", "idraulica"],
    region: "Nord Italia",
    notes: "Centri FZ, mandrini e cambio utensile",
  },
  {
    id: "tech-006",
    name: "Laura Santi",
    email: "l.santi@aestima.demo",
    phone: "393367890123",
    capabilities: ["elettrica", "cnc", "idraulica"],
    region: "Italia centrale",
    notes: "Diagnostica elettrica multipiattaforma",
  },
];

/** Assegnazione demo collegata a req-001 (cinghia VLM-2200). */
export const MOCK_TECHNICIAN_ASSIGNMENTS: TechnicianAssignment[] = [
  {
    id: "ta-001",
    partRequestId: "req-001",
    technicianId: "tech-001",
    status: "contattato",
    subject: "Disponibilità intervento — VLM-400-009/2",
    body:
      "Ciao Luca, abbiamo una richiesta urgente per sostituzione cinghia dentata AT10 su VLM-2200 (matr. 1389, Salumificio Ponte Nuovo). Puoi confermare disponibilità per un intervento in settimana?",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1389",
    componentCode: "VLM-400-009/2",
    componentDescription: "Cinghia dentata AT10 L=2250 h.25",
    assignedLabel: "ieri",
    assignedFull: "Ieri, 09:15",
  },
];

export function newTechnicianId(): string {
  return `tech-${Date.now()}`;
}

export function newTechnicianAssignmentId(): string {
  return `ta-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** Suggerisce capacità di intervento dalla categoria macchina. */
export function capabilitiesForMachineCategory(category: string): string[] {
  const map: Record<string, string[]> = {
    "Impianti di sollevamento": ["sollevamento", "montaggio", "idraulica"],
    "Rettificatrici cilindriche": ["rettifica", "montaggio"],
    "Torni a controllo numerico": ["cnc", "elettrica"],
    "Centri di fresatura": ["fresatura", "montaggio", "idraulica"],
    "Incartonatrici automatiche": ["montaggio", "elettrica", "idraulica"],
  };
  return map[category] ?? ["montaggio", "elettrica"];
}

/** Ordina tecnici: prima quelli con capacità suggerite. */
export function sortTechniciansByMatch(
  technicians: Technician[],
  suggestedIds: string[]
): Technician[] {
  if (suggestedIds.length === 0) return technicians;
  return [...technicians].sort((a, b) => {
    const score = (t: Technician) =>
      t.capabilities.filter((c) => suggestedIds.includes(c)).length;
    return score(b) - score(a);
  });
}
