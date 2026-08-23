/** Campi DB ricambi mappabili da colonne Excel + etichette per UI/AI. */

export type SpareDbField =
  | "codice"
  | "codiceOEM"
  | "nome"
  | "descrizione"
  | "categoria"
  | "um"
  | "prezzoListino"
  | "fornitore"
  | "codiceFornitore"
  | "brand"
  | "produttore"
  | "leadTimeGiorni"
  | "macchinaCompatibile"
  | "disponibile"
  | "stato"
  | "immaginePercorso"
  | "immagineUrl"
  | "ignore";

export type SpareFieldDef = {
  key: SpareDbField;
  label: string;
  hint: string;
  required?: boolean;
};

export const SPARE_DB_FIELDS: SpareFieldDef[] = [
  {
    key: "codice",
    label: "Codice",
    hint: "Codice interno / part number",
    required: true,
  },
  { key: "codiceOEM", label: "Codice OEM / MPN", hint: "Manufacturer part number" },
  { key: "nome", label: "Nome prodotto", hint: "Titolo breve" },
  { key: "descrizione", label: "Descrizione", hint: "Descrizione estesa" },
  { key: "categoria", label: "Categoria", hint: "Famiglia / tipo" },
  { key: "um", label: "Unità di misura", hint: "pz, kg, m…" },
  { key: "prezzoListino", label: "Prezzo listino", hint: "Prezzo di vendita" },
  { key: "fornitore", label: "Fornitore", hint: "Chi vende il pezzo" },
  { key: "codiceFornitore", label: "Codice fornitore", hint: "SKU fornitore" },
  { key: "brand", label: "Brand", hint: "Marchio di listino (es. DEMATIC)" },
  { key: "produttore", label: "Produttore", hint: "Costruttore reale" },
  { key: "leadTimeGiorni", label: "Lead time (giorni)", hint: "Tempi di consegna" },
  {
    key: "macchinaCompatibile",
    label: "Macchina compatibile",
    hint: "Modello / serial macchina",
  },
  { key: "disponibile", label: "Disponibilità", hint: "In stock sì/no" },
  { key: "stato", label: "Stato", hint: "attivo / obsoleto / sostituito" },
  {
    key: "immaginePercorso",
    label: "Percorso immagine",
    hint: "Path relativo file foto",
  },
  { key: "immagineUrl", label: "URL immagine", hint: "Link CDN / http" },
  { key: "ignore", label: "Ignora colonna", hint: "Non importare" },
];

export const SPARE_FIELD_LABEL: Record<SpareDbField, string> = Object.fromEntries(
  SPARE_DB_FIELDS.map((f) => [f.key, f.label])
) as Record<SpareDbField, string>;

export const SPARE_FIELD_KEYS = SPARE_DB_FIELDS.map((f) => f.key);

export function isSpareDbField(v: unknown): v is SpareDbField {
  return typeof v === "string" && (SPARE_FIELD_KEYS as string[]).includes(v);
}
