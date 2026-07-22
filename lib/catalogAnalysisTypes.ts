// Tipi per la demo "Analisi catalogo" — agente di pulizia ricambi.
// In produzione l'analisi girerebbe sul catalogo reale (PDF / export
// gestionale) del cliente; qui usiamo dati di esempio Vallmec.

export type CatalogSourceId =
  | "listino-2026"
  | "catalogo-vlm-2200"
  | "db-vlm-2200"
  | "gestionale";

export type PartCategory =
  | "meccanica"
  | "pneumatica"
  | "elettrica"
  | "trasmissione"
  | "sicurezza"
  | "kit"
  | "altro";

export type FindingKind =
  | "duplicate"
  | "obsolete"
  | "substitution"
  | "erp_discrepancy"
  | "inconsistent_description"
  | "missing_price";

export type ReviewDecision = "pending" | "confirmed" | "corrected" | "ignored";

export interface CatalogArticle {
  id: string;
  code: string;
  description: string;
  sourceId: CatalogSourceId;
  /** Pagina / foglio di origine (demo) */
  location: string;
  listPrice: number | null;
  purchasePrice: number | null;
  category: PartCategory | null;
  /** Presente nell'anagrafica gestionale */
  inErp: boolean;
  erpDescription?: string | null;
  erpPrice?: number | null;
  /** Movimentazioni ultimi 24 mesi (0 = candidato obsoleto) */
  movements24m: number;
  erpAvailable: boolean;
  obsoleteFlag?: boolean;
}

export interface CatalogSourceMeta {
  id: CatalogSourceId;
  label: string;
  fileName: string;
}

export interface PriceProposal {
  purchasePrice: number;
  category: PartCategory;
  multiplier: number;
  proposedPrice: number;
}

export interface CatalogFinding {
  id: string;
  kind: FindingKind;
  /** 0–1 */
  confidence: number;
  title: string;
  summary: string;
  proposedAction: string;
  articleIds: string[];
  codes: string[];
  /** Dettaglio strutturato per la UI */
  detail: Record<string, unknown>;
  priceProposal?: PriceProposal;
  /** Heuristic vs anthropic per i finding fuzzy */
  source: "deterministic" | "anthropic" | "mock";
}

export interface CatalogSummary {
  articleCount: number;
  uniqueCodes: number;
  sources: { id: CatalogSourceId; label: string; count: number }[];
  withPrice: number;
  withoutPrice: number;
  inErp: number;
  notInErp: number;
}

export interface ImpactSummary {
  totalFindings: number;
  highConfidence: number;
  needsReview: number;
  /** Minuti stimati risparmiati vs correzione manuale */
  estimatedMinutesSaved: number;
}

export interface CatalogAnalysisResult {
  summary: CatalogSummary;
  findings: CatalogFinding[];
  impact: ImpactSummary;
  source: "anthropic" | "mock";
}

export const FINDING_KIND_META: Record<
  FindingKind,
  { label: string; actionHint: string; tone: "warn" | "danger" | "brand" | "ok" }
> = {
  duplicate: {
    label: "Codici duplicati",
    actionHint: "Unificare",
    tone: "warn",
  },
  obsolete: {
    label: "Codici obsoleti",
    actionHint: "Marcare come obsoleto e annotare sul catalogo",
    tone: "danger",
  },
  substitution: {
    label: "Possibili sostituzioni",
    actionHint: "Mappare vecchio → nuovo",
    tone: "brand",
  },
  erp_discrepancy: {
    label: "Discrepanze catalogo/gestionale",
    actionHint: "Allineare anagrafica",
    tone: "warn",
  },
  inconsistent_description: {
    label: "Descrizioni incoerenti",
    actionHint: "Normalizzare",
    tone: "warn",
  },
  missing_price: {
    label: "Prezzi mancanti",
    actionHint: "Applicare prezzo proposto",
    tone: "brand",
  },
};

export const CATEGORY_MULTIPLIERS: Record<PartCategory, number> = {
  meccanica: 2.2,
  pneumatica: 2.0,
  elettrica: 2.5,
  trasmissione: 2.1,
  sicurezza: 2.4,
  kit: 1.8,
  altro: 2.0,
};

export const CATEGORY_LABELS: Record<PartCategory, string> = {
  meccanica: "Meccanica",
  pneumatica: "Pneumatica",
  elettrica: "Elettrica / sensori",
  trasmissione: "Trasmissione",
  sicurezza: "Sicurezza",
  kit: "Kit manutenzione",
  altro: "Altro",
};

/** Soglia per conferma in blocco (allineata a ConfidenceBadge "alta"). */
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/** Minuti medi per correggere a mano un'incoerenza (stima demo). */
export const MINUTES_PER_FINDING_MANUAL = 4;
