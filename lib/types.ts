// =============================================================
// Tipi condivisi della demo aestima
// =============================================================

/** Disponibilità simulata a magazzino di un componente. */
export type Availability = "disponibile" | "da_ordinare";

/** Livello di urgenza estratto/valutato dalla richiesta cliente. */
export type Urgency = "bassa" | "normale" | "alta";

/**
 * Riga della distinta base (BOM) di una macchina.
 * Rappresenta un ricambio con codice, descrizione, prezzo e giacenza.
 */
export interface BomComponent {
  /** Codice ricambio interno (es. "SL-2201-VT"). */
  code: string;
  /** Descrizione tecnica del componente. */
  description: string;
  /**
   * Parole chiave / sinonimi con cui un cliente potrebbe descrivere
   * il componente in linguaggio naturale (usate dal matcher mock).
   */
  keywords: string[];
  /** Prezzo di listino unitario, in EUR. */
  listPrice: number;
  /** Giacenza a magazzino (pezzi). 0 = da ordinare. */
  stock: number;
  /** Tempo di approvvigionamento indicativo se non a magazzino. */
  leadTimeDays: number;
  /**
   * Se impostato, il preventivo espande l'intera distinta base
   * (ricambi + ore manodopera) anziché una singola riga.
   */
  bomRef?: string;
}

/** Una macchina con la sua distinta base. */
export interface Machine {
  /** Numero di serie (matricola) univoco. */
  serial: string;
  /** Nome commerciale del modello. */
  model: string;
  /** Anno di produzione/vendita. */
  year: number;
  /** Categoria/famiglia macchina. */
  category: string;
  /** Distinta base: elenco componenti/ricambi. */
  bom: BomComponent[];
}

/**
 * Output strutturato dell'agente (ciò che restituisce l'API /api/analyze).
 * I campi in italiano corrispondono a quanto richiesto a Claude nel prompt.
 */
export interface AnalysisResult {
  macchina: string;
  numero_serie: string;
  componente_identificato: string;
  urgenza: Urgency;
  note: string;
  /** true se il risultato arriva da Claude, false se dal fallback mock. */
  source: "anthropic" | "mock";
}

/** Esito del match tra l'analisi dell'agente e i dati mock (distinta). */
export interface MatchResult {
  machine: Machine | null;
  component: BomComponent | null;
  availability: Availability | null;
}

/** Riga del preventivo. */
export interface QuoteLine {
  code: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

/** Preventivo completo pronto da mostrare "su carta intestata". */
export interface Quote {
  number: string;
  date: string;
  customerName: string;
  lines: QuoteLine[];
  subtotal: number;
  /** Ricarico per urgenza (EUR), 0 se non applicabile. */
  urgencySurcharge: number;
  urgencySurchargePct: number;
  vatPct: number;
  vat: number;
  total: number;
  availability: Availability;
  leadTimeDays: number;
  notes: string;
}
