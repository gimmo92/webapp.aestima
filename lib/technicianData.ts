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
    reportNumber: "RAP-2025-0142",
    machineSerial: "IDC-114-084",
    machineModel: "Impianto IDC 114 TCZ",
    technicianId: "tech-001",
    interventionDate: "15/03/2025",
    interventionDateFull: "15 marzo 2025 · 08:30–13:00",
    type: "sostituzione",
    outcome: "completato",
    hours: 4.5,
    summary: "Sostituzione curva di rinvio 3381200010 e regolazione tensione fune",
    workPerformed:
      "Smontaggio curva di rinvio usurata, montaggio nuovo assieme 3381200010 da distinta base. Controllo allineamento pulegge, serraggio bulloneria UNI a coppia. Verifica tensionamento fune RTP e collaudo ciclo completo impianto.",
    partsUsed: ["3381200010", "1291200130", "1002033"],
    customerCompany: "Elevatori Veneto S.p.A.",
    assignmentId: "ta-001",
  },
  {
    id: "ir-002",
    reportNumber: "RAP-2024-0891",
    machineSerial: "IDC-114-084",
    machineModel: "Impianto IDC 114 TCZ",
    technicianId: "tech-002",
    interventionDate: "22/11/2024",
    interventionDateFull: "22 novembre 2024 · 09:00–12:00",
    type: "manutenzione",
    outcome: "completato",
    hours: 3,
    summary: "Manutenzione programmata assieme fune e semidisco giunzione",
    workPerformed:
      "Ispezione visiva cavo D.6, pulizia e lubrificazione punti di curvatura. Controllo pressione semidisco giunzione IDC 114. Sostituito anello Seeger di bloccaggio per usura.",
    partsUsed: ["UNI7437D019FE"],
    customerCompany: "Logistica Nord S.r.l.",
  },
  {
    id: "ir-003",
    reportNumber: "RAP-2025-0098",
    machineSerial: "MX-4521",
    machineModel: "Rettificatrice RX-400",
    technicianId: "tech-003",
    interventionDate: "04/02/2025",
    interventionDateFull: "4 febbraio 2025 · 14:00–16:00",
    type: "sostituzione",
    outcome: "completato",
    hours: 2,
    summary: "Sostituzione anello tenuta mandrino SL-2201-VT",
    workPerformed:
      "Fermata macchina, scarico mandrino, rimozione guarnizione Viton Ø45 danneggiata. Montaggio nuovo kit tenuta, ripristino preload cuscinetti. Test runout mandrino entro tolleranza.",
    partsUsed: ["SL-2201-VT"],
    customerCompany: "Officine Meccaniche Basso",
  },
  {
    id: "ir-004",
    reportNumber: "RAP-2024-0312",
    machineSerial: "MX-4521",
    machineModel: "Rettificatrice RX-400",
    technicianId: "tech-003",
    interventionDate: "18/09/2024",
    interventionDateFull: "18 settembre 2024 · 10:00–11:30",
    type: "verifica",
    outcome: "completato",
    hours: 1.5,
    summary: "Verifica trasmissione mandrino e stato cinghia HTD-8M",
    workPerformed:
      "Controllo tensione cinghia CB-8890-A, ispezione dentatura pulegge. Cinghia entro limiti ma pianificata sostituzione entro 500 h. Report inviato al cliente con raccomandazioni.",
    customerCompany: "Officine Meccaniche Basso",
  },
  {
    id: "ir-005",
    reportNumber: "RAP-2025-0110",
    machineSerial: "TC-7788",
    machineModel: "Tornio CNC TC-220",
    technicianId: "tech-004",
    interventionDate: "28/02/2025",
    interventionDateFull: "28 febbraio 2025 · 07:30–09:00",
    type: "riparazione",
    outcome: "parziale",
    hours: 1.5,
    summary: "Sostituzione sensore finecorsa asse X — cablaggio da completare",
    workPerformed:
      "Rilevato sensore SN-3310-IX difettoso su asse X. Sostituito sensore, verifica LED e segnale PLC ok. Cablatura passacavo da ripristinare: necessario secondo intervento con canalina smontata.",
    partsUsed: ["SN-3310-IX"],
    customerCompany: "Precision Parts S.r.l.",
  },
  {
    id: "ir-006",
    reportNumber: "RAP-2024-1205",
    machineSerial: "FR-3092",
    machineModel: "Fresatrice FZ-500",
    technicianId: "tech-005",
    interventionDate: "05/12/2024",
    interventionDateFull: "5 dicembre 2024 · 08:00–13:00",
    type: "verifica",
    outcome: "completato",
    hours: 5,
    summary: "Collaudo elettromandrino 12.000 rpm e bilanciamento",
    workPerformed:
      "Controllo vibrazioni mandrino a 8.000 e 12.000 rpm con analizzatore. Sostituito filtro aria compressa FL-4420-AC. Lubrificazione cambio utensile automatico. Emesso certificato collaudo interno.",
    partsUsed: ["FL-4420-AC"],
    customerCompany: "Fresatura Industriale S.p.A.",
  },
  {
    id: "ir-007",
    reportNumber: "RAP-2025-0067",
    machineSerial: "FR-3092",
    machineModel: "Fresatrice FZ-500",
    technicianId: "tech-006",
    interventionDate: "20/01/2025",
    interventionDateFull: "20 gennaio 2025 · 13:00–15:30",
    type: "manutenzione",
    outcome: "followup",
    hours: 2.5,
    summary: "Diagnostica elettropneumatica cambio utensile — valvola da ordinare",
    workPerformed:
      "Anomalia pressione minima su circuito cambio utensile. Ispezione elettrovalvole e kit TN-6612-VT: guarnizione principale deteriorata. Intervento sospeso in attesa ricambio kit tenute pneumatiche.",
    partsUsed: [],
    customerCompany: "Fresatura Industriale S.p.A.",
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
