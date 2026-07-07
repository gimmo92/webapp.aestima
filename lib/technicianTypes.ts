// =============================================================
// Tipi — tab Tecnici (interventi in campo)
// =============================================================

/** Capacità / tipologia di intervento tecnico. */
export interface InterventionCapability {
  id: string;
  label: string;
  color: string;
}

export type TechnicianAssignmentStatus =
  | "bozza"
  | "contattato"
  | "disponibile"
  | "non_disponibile"
  | "in_corso"
  | "completato"
  | "annullato";

export interface TechnicianAssignmentStatusConfig {
  id: TechnicianAssignmentStatus;
  label: string;
  color: string;
}

/** Tecnico di campo in anagrafica. */
export interface Technician {
  id: string;
  name: string;
  email: string;
  /** Numero WhatsApp (prefisso internazionale, es. 39347…). */
  phone: string;
  /** Capacità di intervento (id da INTERVENTION_CAPABILITIES). */
  capabilities: string[];
  region?: string;
  notes?: string;
}

/** Assegnazione richiesta → tecnico per verifica disponibilità / intervento. */
export interface TechnicianAssignment {
  id: string;
  partRequestId: string;
  technicianId: string;
  status: TechnicianAssignmentStatus;
  subject: string;
  body: string;
  machineModel?: string;
  machineSerial?: string;
  componentCode?: string;
  componentDescription?: string;
  assignedLabel: string;
  assignedFull: string;
}

export type TechnicianInput = Omit<Technician, "id">;

/** Tipologia di intervento sul campo. */
export type InterventionReportType =
  | "manutenzione"
  | "riparazione"
  | "sostituzione"
  | "verifica"
  | "installazione";

/** Esito del rapporto intervento. */
export type InterventionReportOutcome =
  | "completato"
  | "parziale"
  | "followup";

export interface InterventionReportTypeConfig {
  id: InterventionReportType;
  label: string;
  color: string;
}

export interface InterventionReportOutcomeConfig {
  id: InterventionReportOutcome;
  label: string;
  color: string;
}

/** Rapporto di intervento tecnico su una macchina. */
export interface InterventionReport {
  id: string;
  reportNumber: string;
  machineSerial: string;
  machineModel: string;
  technicianId: string;
  interventionDate: string;
  interventionDateFull: string;
  type: InterventionReportType;
  outcome: InterventionReportOutcome;
  /** Ore uomo impiegate. */
  hours: number;
  /** Sintesi una riga per la lista. */
  summary: string;
  /** Descrizione lavori eseguiti. */
  workPerformed: string;
  partsUsed?: string[];
  customerCompany?: string;
  /** Collegamento opzionale all'assegnazione inbox. */
  assignmentId?: string;
}
