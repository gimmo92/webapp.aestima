import { MACHINES } from "./mockData";
import type { DocType, FileClassification, FileExt } from "./archiveTypes";

const EXT_TO_TIPO: Record<FileExt, DocType> = {
  pdf: "disegno",
  xlsx: "distinta",
  jpg: "foto",
  png: "foto",
  dwg: "disegno",
  docx: "manuale",
};

/**
 * Classificazione euristica da nome file (upload operatore).
 * Estrae tipo, revisione, anno e — se possibile — collegamento macchina.
 */
export function inferClassificationFromName(
  name: string,
  ext: FileExt
): FileClassification {
  const lower = name.toLowerCase();
  let tipo: DocType = EXT_TO_TIPO[ext] ?? "disegno";

  if (/offerta|preventivo|\bprev[-_]/.test(lower)) tipo = "offerta";
  else if (/listino|catalogo|catalogue/.test(lower)) tipo = "catalogo";
  else if (/distinta|\bbom\b|\bdb[_-]/.test(lower)) tipo = "distinta";
  else if (/manuale|manual|istruzione/.test(lower)) tipo = "manuale";
  else if (/foto|img[_-]|image|photo/.test(lower)) tipo = "foto";
  else if (/disegno|schema|\bcad\b/.test(lower)) tipo = "disegno";

  const revMatch = name.match(/rev[.\s_-]*([A-Z0-9]+)/i);
  const revisione = revMatch?.[1]?.toUpperCase();

  const yearMatch = name.match(/(20\d{2})/);
  const data = yearMatch?.[1];

  let macchinaSerial: string | null = null;
  let confidence = 0.55;

  for (const m of MACHINES) {
    const serial = m.serial.toLowerCase();
    const modelKey = m.model.toLowerCase().replace(/\s+/g, "");
    if (
      lower.includes(serial) ||
      lower.replace(/[\s_-]/g, "").includes(modelKey)
    ) {
      macchinaSerial = m.serial;
      confidence = 0.9;
      break;
    }
  }

  if (!macchinaSerial) {
    // Accetta anche modelli dopo underscore (es. DB_VLM-2200_rev.C.xlsx)
    const modelMatch = name.match(
      /(?:^|[^A-Za-z0-9])([A-Z]{2,5}[-_]?\d{3,5}[A-Z]?)(?=[^A-Za-z0-9]|$)/i
    );
    if (modelMatch) {
      macchinaSerial = modelMatch[1].toUpperCase().replace("_", "-");
      confidence = 0.82;
    }
  }

  // Documenti di archivio generici (listini, parchi, storici) → bucket condiviso
  if (!macchinaSerial && /listino|storico|parco[_-]?installato/.test(lower)) {
    macchinaSerial = "GENERALE";
    confidence = 0.8;
  }

  // Modello descritto a parole (es. distinta_incartonatrice)
  if (!macchinaSerial) {
    const wordModel = lower.match(
      /(?:distinta|manuale|disegno)[_-]([a-z][a-z0-9]{3,})/
    );
    if (wordModel) {
      macchinaSerial = wordModel[1].toUpperCase();
      confidence = 0.72;
    }
  }

  return {
    tipo,
    macchinaSerial,
    revisione,
    data,
    confidence,
    source: "mock",
  };
}
