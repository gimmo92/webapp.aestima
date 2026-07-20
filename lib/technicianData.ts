import type {
  InterventionCapability,
  InterventionReport,
  InterventionReportOutcomeConfig,
  InterventionReportTypeConfig,
  Technician,
  TechnicianAssignment,
  TechnicianAssignmentStatusConfig,
} from "./technicianTypes";

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

export const MOCK_INTERVENTION_REPORTS: InterventionReport[] = [];
export const MOCK_TECHNICIANS: Technician[] = [];
export const MOCK_TECHNICIAN_ASSIGNMENTS: TechnicianAssignment[] = [];

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
