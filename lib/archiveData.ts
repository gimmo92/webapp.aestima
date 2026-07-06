import { MACHINES } from "./mockData";
import type { DocType, SourceFile } from "./archiveTypes";

// =============================================================
// DATI MOCK — Archivio documentale after-sales
// -------------------------------------------------------------
// NB (produzione): l'agente si collegherebbe a una cartella cloud
// reale (Google Drive / SharePoint / Dropbox via API) e leggerebbe
// i file veri. Qui i file sono mock, solo per la demo.
//
// Ogni file ha:
//  - un nome "caotico" realistico + estensione, dimensione, data;
//  - una `preview` (contenuto mock) usata per la classificazione;
//  - una `classification` ground-truth (tipo, macchina, codice,
//    revisione, confidenza) che l'agente "ricostruisce".
// I file con confidenza < SOGLIA finiscono nella coda di revisione.
// =============================================================

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

/** Elenco matricole note (per la correzione manuale in revisione). */
export const KNOWN_MACHINES = MACHINES.map((m) => ({
  serial: m.serial,
  label: `${m.model} · ${m.serial}`,
}));

/**
 * Documenti in archivio collegati a una macchina (per i riferimenti
 * cliccabili mostrati nell'inbox). Include sia i file già collegati
 * alla matricola sia quelli la cui matricola corretta è quella.
 */
export function docsForMachine(serial: string) {
  return SOURCE_FILES.filter(
    (f) =>
      f.classification.macchinaSerial === serial || f.correctSerial === serial
  );
}

export const SOURCE_FILES: SourceFile[] = [
  {
    id: "f01",
    name: "scan_0042.pdf",
    ext: "pdf",
    sizeLabel: "2,4 MB",
    modified: "12/03/2019",
    preview:
      "Disegno tecnico quotato — anello di tenuta mandrino, Rettificatrice RX-400. Rev. B",
    classification: {
      tipo: "disegno",
      macchinaSerial: "MX-4521",
      codice: "SL-2201-VT",
      revisione: "B",
      data: "2019",
      confidence: 0.96,
    },
  },
  {
    id: "f02",
    name: "distinta_rev_finale_OK.xlsx",
    ext: "xlsx",
    sizeLabel: "88 KB",
    modified: "04/07/2021",
    preview:
      "Foglio di calcolo: elenco componenti, codici, quantità. Rettificatrice RX-400.",
    classification: {
      tipo: "distinta",
      macchinaSerial: "MX-4521",
      revisione: "3",
      data: "2021",
      confidence: 0.93,
    },
  },
  {
    id: "f03",
    name: "IMG_20190312.jpg",
    ext: "jpg",
    sizeLabel: "3,1 MB",
    modified: "12/03/2019",
    preview: "Fotografia di un cuscinetto obliquo montato su albero mandrino.",
    classification: {
      tipo: "foto",
      macchinaSerial: "MX-4521",
      codice: "BR-1140-C4",
      confidence: 0.82,
    },
  },
  {
    id: "f04",
    name: "disegno vecchio.dwg",
    ext: "dwg",
    sizeLabel: "540 KB",
    modified: "22/11/2020",
    preview: "File CAD — gruppo pompa refrigerante, Tornio CNC TC-220.",
    classification: {
      tipo: "disegno",
      macchinaSerial: "TC-7788",
      codice: "PM-5502-EL",
      revisione: "A",
      confidence: 0.9,
    },
  },
  {
    id: "f05",
    name: "offerta cliente rossi.pdf",
    ext: "pdf",
    sizeLabel: "210 KB",
    modified: "18/01/2022",
    preview:
      "Preventivo PREV-2022-0184 a Rossi Meccanica per ricambio tenuta, Rettificatrice RX-400.",
    classification: {
      tipo: "offerta",
      macchinaSerial: "MX-4521",
      codice: "SL-2201-VT",
      data: "2022",
      confidence: 0.9,
    },
  },
  {
    id: "f06",
    name: "manuale_v2_def.pdf",
    ext: "pdf",
    sizeLabel: "6,8 MB",
    modified: "09/09/2021",
    preview:
      "Manuale d'uso e manutenzione — Tornio CNC TC-220. Capitoli: sicurezza, manutenzione, ricambi.",
    classification: {
      tipo: "manuale",
      macchinaSerial: "TC-7788",
      revisione: "2",
      confidence: 0.97,
    },
  },
  {
    id: "f07",
    name: "catalogo_ricambi_2021.pdf",
    ext: "pdf",
    sizeLabel: "12,3 MB",
    modified: "15/02/2021",
    preview:
      "Catalogo ricambi Fresatrice FZ-500 — elettromandrino, filtri, kit tenute.",
    classification: {
      tipo: "catalogo",
      macchinaSerial: "FR-3092",
      data: "2021",
      confidence: 0.94,
    },
  },
  {
    id: "f08",
    name: "TC220_schema_elettrico.pdf",
    ext: "pdf",
    sizeLabel: "1,1 MB",
    modified: "03/05/2021",
    preview:
      "Schema elettrico quadro — sensori asse X, Tornio CNC TC-220. Rev. C",
    classification: {
      tipo: "disegno",
      macchinaSerial: "TC-7788",
      codice: "SN-3310-IX",
      revisione: "C",
      confidence: 0.88,
    },
  },
  {
    id: "f09",
    name: "foto pezzo whatsapp.jpg",
    ext: "jpg",
    sizeLabel: "820 KB",
    modified: "27/06/2023",
    preview: "Foto sfocata di un filtro aria compressa smontato.",
    classification: {
      tipo: "foto",
      macchinaSerial: "FR-3092",
      codice: "FL-4420-AC",
      confidence: 0.79,
    },
  },
  {
    id: "f10",
    name: "distinta_base_FZ500.xlsx",
    ext: "xlsx",
    sizeLabel: "104 KB",
    modified: "11/01/2020",
    preview:
      "Distinta base Fresatrice FZ-500 — elettromandrino ISO40, kit tenute cambio utensile.",
    classification: {
      tipo: "distinta",
      macchinaSerial: "FR-3092",
      revisione: "1",
      data: "2020",
      confidence: 0.95,
    },
  },

  // --- File a BASSA confidenza → coda di revisione umana ---
  {
    id: "f11",
    name: "doc scannerizzato 3.pdf",
    ext: "pdf",
    sizeLabel: "1,7 MB",
    modified: "30/08/2018",
    preview:
      "Disegno scansionato di scarsa qualità. Cartiglio parzialmente leggibile: '...tenuta... MX-45...'",
    classification: {
      tipo: "disegno",
      // L'agente propone una matricola simile ma NON esistente.
      macchinaSerial: "MX-450",
      codice: "SL-2201-VT",
      confidence: 0.42,
    },
    correctSerial: "MX-4521",
  },
  {
    id: "f12",
    name: "preventivo_.pdf",
    ext: "pdf",
    sizeLabel: "180 KB",
    modified: "05/12/2022",
    preview:
      "Preventivo senza intestazione macchina. Menziona 'pompa' e 'sensore', macchina non chiara.",
    classification: {
      tipo: "offerta",
      macchinaSerial: null,
      confidence: 0.51,
    },
    correctSerial: "TC-7788",
  },
];
