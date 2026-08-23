/** Anagrafica ricambi estratta dai documenti archivio. */

export type SparePartStatus = "attivo" | "obsoleto" | "sostituito";

export type SuccedaneoTipo =
  | "equivalente"
  | "sostituisce"
  | "sostituito_da"
  | "alternativa_fornitore";

export interface SparePartSource {
  fileId: string;
  fileName: string;
  sheet?: string;
  row?: number;
}

export interface SparePartSuccedaneo {
  code: string;
  tipo: SuccedaneoTipo;
  note?: string;
}

/** Foto associate al ricambio (path Excel, URL remoto o file caricato). */
export interface SparePartImage {
  path?: string;
  url?: string;
  role?: "primary" | "extra" | "thumbnail";
}

export interface SparePart {
  id: string;
  codice: string;
  codiceOEM?: string;
  nome?: string;
  descrizione: string;
  categoria?: string;
  um?: string;
  prezzoListino?: number | null;
  fornitore?: string;
  codiceFornitore?: string;
  brand?: string;
  produttore?: string;
  leadTimeGiorni?: number | null;
  macchinaCompatibile?: string;
  disponibile?: boolean | null;
  stato: SparePartStatus;
  /** 0–100 */
  completezza: number;
  immagini: SparePartImage[];
  sorgenti: SparePartSource[];
  succedanei: SparePartSuccedaneo[];
  /** True se valori in conflitto tra sorgenti (non sovrascritti). */
  daVerificare: boolean;
  conflictFields?: string[];
}

export type SparePartPatch = Partial<
  Omit<SparePart, "id" | "sorgenti" | "completezza">
> & {
  sorgenti?: SparePartSource[];
  completezza?: number;
};

/** Campi usati per completezza %. */
export const SPARE_COMPLETENESS_FIELDS = [
  "codice",
  "descrizione",
  "prezzoListino",
  "fornitore",
  "macchinaCompatibile",
  "categoria",
  "um",
] as const;

export function computeSpareCompleteness(part: Partial<SparePart>): number {
  const checks: boolean[] = [
    Boolean(part.codice?.trim()),
    Boolean(part.descrizione?.trim() || part.nome?.trim()),
    part.prezzoListino != null && part.prezzoListino > 0,
    Boolean(part.fornitore?.trim() || part.produttore?.trim() || part.brand?.trim()),
    Boolean(part.macchinaCompatibile?.trim()),
    Boolean(part.categoria?.trim()),
    Boolean(part.um?.trim()) || (part.immagini?.length ?? 0) > 0,
  ];
  const ok = checks.filter(Boolean).length;
  return Math.round((ok / checks.length) * 100);
}

export const SUCCEDANEO_TIPO_LABELS: Record<SuccedaneoTipo, string> = {
  equivalente: "Equivalente",
  sostituisce: "Sostituisce",
  sostituito_da: "Sostituito da",
  alternativa_fornitore: "Alternativa fornitore",
};

/** Tipo inverso per link bidirezionale. */
export function inverseSuccedaneoTipo(tipo: SuccedaneoTipo): SuccedaneoTipo {
  if (tipo === "sostituisce") return "sostituito_da";
  if (tipo === "sostituito_da") return "sostituisce";
  return tipo;
}

export function newSparePartId(): string {
  return `sp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
