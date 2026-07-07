import type {
  InterventionCapability,
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

/** Assegnazione demo collegata a req-001 (curva rinvio IDC). */
export const MOCK_TECHNICIAN_ASSIGNMENTS: TechnicianAssignment[] = [
  {
    id: "ta-001",
    partRequestId: "req-001",
    technicianId: "tech-001",
    status: "contattato",
    subject: "Disponibilità intervento — 3381200010",
    body:
      "Ciao Luca, abbiamo una richiesta urgente per sostituzione curva di rinvio su IDC 114 TCZ (matr. IDC-114-084). Puoi confermare disponibilità per un intervento in settimana?",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    componentCode: "3381200010",
    componentDescription: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G (TACCHE)",
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
  };
  return map[category] ?? [];
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
