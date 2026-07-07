// =============================================================
// Tipi dell'Archivio documentale after-sales
// =============================================================

/** Tipo di documento riconosciuto dall'agente. */
export type DocType =
  | "disegno"
  | "distinta"
  | "catalogo"
  | "offerta"
  | "manuale"
  | "foto";

/** Estensioni file supportate nella demo. */
export type FileExt = "pdf" | "xlsx" | "jpg" | "png" | "dwg" | "docx";

/** Metadati estratti + classificazione di un file. */
export interface FileClassification {
  tipo: DocType;
  /** Matricola della macchina a cui il documento è collegato (null se incerto). */
  macchinaSerial: string | null;
  /** Codice ricambio estratto, se presente. */
  codice?: string;
  /** Revisione del documento, se presente. */
  revisione?: string;
  /** Data del documento, se estraibile. */
  data?: string;
  /** Confidenza della classificazione (0..1). */
  confidence: number;
  /** Origine della classificazione: Claude o fallback mock. */
  source?: "anthropic" | "mock";
}

/**
 * File "sorgente" in arrivo nella cartella cloud disordinata.
 *
 * In PRODUZIONE questi file arriverebbero da una cartella cloud reale
 * (Google Drive / SharePoint / Dropbox via API). Qui sono mock.
 */
export interface SourceFile {
  id: string;
  /** Nome file caotico/realistico. */
  name: string;
  ext: FileExt;
  sizeLabel: string;
  modified: string;
  /**
   * Anteprima del contenuto (mock) usata dall'agente per classificare.
   * In produzione sarebbe testo estratto (OCR/parsing) o metadati reali.
   */
  preview: string;
  /** Classificazione "ground truth" mock (l'agente la ricostruisce). */
  classification: FileClassification;
  /**
   * Per i file a bassa confidenza: matricola corretta da confermare
   * (l'agente propone `classification.macchinaSerial`, spesso errata).
   */
  correctSerial?: string;
  /** URL pubblico per anteprima/download (distinte Excel in /public). */
  publicUrl?: string;
  /** File aggiunto dall'operatore via upload (solo sessione corrente). */
  uploaded?: boolean;
}

/**
 * Documento ormai archiviato e collegato a una macchina.
 * È l'unità mostrata nella vista "Archivio organizzato".
 */
export interface ArchivedDoc {
  file: SourceFile;
  tipo: DocType;
  macchinaSerial: string;
  codice?: string;
  revisione?: string;
  data?: string;
  confidence: number;
  source: "anthropic" | "mock";
}

/** Risposta della route /api/classify per un singolo file. */
export interface ClassifyResult {
  id: string;
  tipo: DocType;
  macchinaSerial: string | null;
  codice?: string;
  revisione?: string;
  data?: string;
  confidence: number;
  source: "anthropic" | "mock";
}
