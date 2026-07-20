import { MACHINES } from "./mockData";
import type { DocType, SourceFile } from "./archiveTypes";

/** Soglia sotto la quale un file va in revisione umana. */
export const REVIEW_THRESHOLD = 0.7;

/** Configurazione dei tipi di documento (etichetta + colore). */
export const DOC_TYPES: Record<DocType, { label: string; color: string }> = {
  disegno: { label: "Disegno", color: "#3b82f6" },
  distinta: { label: "Distinta base", color: "#a855f7" },
  catalogo: { label: "Catalogo", color: "#06b6d4" },
  offerta: { label: "Offerta", color: "#22c55e" },
  manuale: { label: "Manuale", color: "#f59e0b" },
  foto: { label: "Foto componente", color: "#ec4899" },
};

/** Nome leggibile della macchina a partire dalla matricola. */
export function machineLabel(serial: string | null): string {
  if (!serial) return "Non assegnato";
  const m = MACHINES.find((x) => x.serial === serial);
  return m ? `${m.model} · ${m.serial}` : serial;
}

/** Categoria/tipo macchina (famiglia) a partire dalla matricola. */
export function machineCategory(serial: string): string {
  const m = MACHINES.find((x) => x.serial === serial);
  return m?.category ?? "Altro";
}

/** Etichette leggibili per estensione file. */
export const FILE_EXT_LABELS: Record<string, string> = {
  pdf: "PDF",
  xlsx: "Excel",
  jpg: "Immagine JPG",
  png: "Immagine PNG",
  dwg: "CAD / DWG",
  docx: "Word",
};

/** Anno del documento (da metadati o data file). */
export function docYear(doc: {
  data?: string;
  file: { modified: string };
}): string {
  if (doc.data) {
    const m = doc.data.match(/\d{4}/);
    if (m) return m[0];
  }
  const parts = doc.file.modified.split("/");
  const y = parts[parts.length - 1];
  return y && /^\d{4}$/.test(y) ? y : "Senza anno";
}

/** Elenco matricole note (per la correzione manuale in revisione). */
export const KNOWN_MACHINES = MACHINES.map((m) => ({
  serial: m.serial,
  label: `${m.model} · ${m.serial}`,
}));

/**
 * Documenti in archivio collegati a una macchina (per i riferimenti
 * cliccabili mostrati nell'inbox).
 */
export function docsForMachine(serial: string) {
  return SOURCE_FILES.filter(
    (f) =>
      f.classification.macchinaSerial === serial || f.correctSerial === serial
  );
}

/** File archivio (vuoto: li carichi / colleghi tu). */
export const SOURCE_FILES: SourceFile[] = [];
