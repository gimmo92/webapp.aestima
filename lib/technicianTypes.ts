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
