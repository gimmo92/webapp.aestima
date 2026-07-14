// =============================================================
// Tipi — knowledge base troubleshooting appresa dagli interventi
// In produzione persistita su DB, indicizzata per ricerca semantica
// e alimentata dallo storico interventi reale (CMMS/ticketing).
// =============================================================

export type ProblemCategory =
  | "troubleshooting"
  | "ricambio"
  | "manutenzione"
  | "altro";

export interface KnowledgeSparePartRef {
  code: string;
  description: string;
}

/** Voce strutturata nella knowledge base / manuale troubleshooting. */
export interface KnowledgeEntry {
  id: string;
  machineModel: string;
  machineSerial?: string;
  problemCategory: ProblemCategory;
  /** Sintomo generalizzato e riutilizzabile */
  symptom: string;
  probableCause: string;
  solution: string;
  spareParts: KnowledgeSparePartRef[];
  /** Quante volte il problema si è ripresentato */
  frequency: number;
  sourceTicketId?: string;
  consolidated: boolean;
  mergedFromIds?: string[];
  createdLabel: string;
  createdFull: string;
  updatedFull: string;
  tags: string[];
}

export interface ExtractKnowledgeInput {
  ticketId: string;
  summary: string;
  description: string;
  solution: string;
  machineModel?: string;
  machineSerial?: string;
  conversationContext?: string;
}

export interface ConsolidateKnowledgeInput {
  entries: KnowledgeEntry[];
}
