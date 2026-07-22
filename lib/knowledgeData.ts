import type { KnowledgeEntry, ProblemCategory } from "./knowledgeTypes";

// =============================================================
// DATI MOCK — knowledge base / Manuale troubleshooting
// Allineata a Desktop/dummy data demo:
//   Parco_installato_Vallmec.xlsx
//   Listino_ricambi_Vallmec_2026.xlsx
//   DB_VLM-2200_rev.C.xlsx / Catalogo ricambi Vallmec VLM-2200
// =============================================================

export const PROBLEM_CATEGORY_LABELS: Record<ProblemCategory, string> = {
  troubleshooting: "Troubleshooting",
  ricambio: "Ricambio",
  manutenzione: "Manutenzione",
  altro: "Altro",
};

/** Soglia per badge "problema ricorrente" nella vista Manuale. */
export const RECURRING_FREQUENCY_THRESHOLD = 3;

export function newKnowledgeId(): string {
  const n = Math.floor(100 + Math.random() * 900);
  return `KB-${n}`;
}

export const MOCK_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: "KB-101",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1389",
    problemCategory: "troubleshooting",
    symptom:
      "Cinghia gruppo spinta salta i denti / rumore metallico in fase di inserimento cartone.",
    probableCause:
      "Usura cinghia dentata AT10 L=2250 h.25 oltre le 4.000 h previste da listino, o disallineamento pulegge AT10 z=32.",
    solution:
      "Ispezionare cinghia VLM-400-009/2 e puleggia VLM-400-010. Sostituire la cinghia se denti consumati o allungamento. Ritensionare secondo Catalogo ricambi Vallmec VLM-2200 / manuale cap. gruppo spinta. Collaudo ciclo completo.",
    spareParts: [
      {
        code: "VLM-400-009/2",
        description: "Cinghia dentata AT10 L=2250 h.25",
      },
      {
        code: "VLM-400-010",
        description: "Puleggia dentata AT10 z=32",
      },
    ],
    frequency: 5,
    consolidated: true,
    createdLabel: "15 gen",
    createdFull: "15 gen 2026",
    updatedFull: "2 apr 2026",
    tags: ["cinghia", "spinta", "at10", "rumore", "vlm-2200"],
  },
  {
    id: "KB-102",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1418",
    problemCategory: "troubleshooting",
    symptom:
      "Cartone si apre male sul lato destro / ventose non trattengono i fustellati in formazione.",
    probableCause:
      "Usura ventose a soffietto D.50 NBR (sostituzione ogni ~2.000 h) e/o calo vuoto sul generatore.",
    solution:
      "Sostituire VLM-300-004 (Festo ESS-50-SN). Verificare generatore di vuoto VLM-300-005 e tubazioni. Non usare VLM-300-004-SI (fuori produzione, solo VLM 1600 fino a matr. 0654).",
    spareParts: [
      {
        code: "VLM-300-004",
        description: "Ventosa a soffietto D.50 NBR",
      },
      {
        code: "VLM-300-005",
        description: "Generatore di vuoto",
      },
    ],
    frequency: 4,
    consolidated: true,
    createdLabel: "22 feb",
    createdFull: "22 feb 2026",
    updatedFull: "10 lug 2026",
    tags: ["ventosa", "vuoto", "fustellato", "formazione", "fontanini"],
  },
  {
    id: "KB-103",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1412",
    problemCategory: "troubleshooting",
    symptom:
      "Fotocellula ingresso non rileva il prodotto / falso segnale presenza fustellato.",
    probableCause:
      "Fotocellula E3Z-D62 sporca, disallineata o fuori specifica ottica.",
    solution:
      "Pulire ottiche e verificare allineamento. Se persiste, sostituire VLM-200-040 (Omron E3Z-D62). Su contratto service full (fascia A) applicare netto listino 2026.",
    spareParts: [
      {
        code: "VLM-200-040",
        description: "Fotocellula presenza prodotto E3Z-D62",
      },
    ],
    frequency: 3,
    consolidated: false,
    createdLabel: "8 mar",
    createdFull: "8 mar 2026",
    updatedFull: "8 mar 2026",
    tags: ["fotocellula", "ingresso", "e3z-d62", "nutrilab"],
  },
  {
    id: "KB-104",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1475",
    problemCategory: "ricambio",
    symptom:
      "Richiesta lame taglio nastro + kit manutenzione 2.000 ore per fermo programmato.",
    probableCause:
      "Usura lame testata nastrante e scadenza tagliando 2.000 h secondo piano OEM VLM-2200.",
    solution:
      "Ordinare VLM-500-011 × 2 (min. consigliato) e VLM-KIT-2000H. Verificare anche testata superiore VLM-500-001 se il taglio è irregolare. LT listino: lame 10 gg, kit secondo giacenza.",
    spareParts: [
      { code: "VLM-500-011", description: "Lama di taglio nastro" },
      {
        code: "VLM-KIT-2000H",
        description: "Kit manutenzione 2.000 ore VLM 2200",
      },
      {
        code: "VLM-500-001",
        description: "Testata nastrante superiore 50 mm",
      },
    ],
    frequency: 6,
    consolidated: true,
    createdLabel: "12 mar",
    createdFull: "12 mar 2026",
    updatedFull: "20 giu 2026",
    tags: ["lame", "nastratrice", "kit 2000", "serravalle"],
  },
  {
    id: "KB-105",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1364",
    problemCategory: "troubleshooting",
    symptom:
      "Rumore / gioco sul gruppo spinta con vibrazione in fase di inserimento.",
    probableCause:
      "Pattini guida lineare HGH20CA usurati e/o guida HGR20R con gioco; possibile cinghia AT10 in inizio usura.",
    solution:
      "Ispezionare VLM-400-004 e VLM-400-003. Sostituire pattini se gioco > specifica Hiwin. Verificare cinghia VLM-400-009/2. Macchina in contratto service base (fascia B).",
    spareParts: [
      {
        code: "VLM-400-004",
        description: "Pattino guida lineare HGH20CA",
      },
      {
        code: "VLM-400-003",
        description: "Guida lineare a ricircolo di sfere HGR20R",
      },
      {
        code: "VLM-400-009/2",
        description: "Cinghia dentata AT10 L=2250 h.25",
      },
    ],
    frequency: 3,
    consolidated: true,
    createdLabel: "20 mar",
    createdFull: "20 mar 2026",
    updatedFull: "15 apr 2026",
    tags: ["vibrazione", "spinta", "pattino", "guida", "val trebbia"],
  },
  {
    id: "KB-106",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1432",
    problemCategory: "troubleshooting",
    symptom:
      "Sensore finecorsa slitta / asse spinta non letto dal PLC.",
    probableCause:
      "Sensore induttivo M12 fuori portata, cablaggio interrotto o elemento danneggiato.",
    solution:
      "Verificare distanza di intervento e connettore. Sostituire VLM-400-030 (Pepperl+Fuchs NBB4-12GM50-E2). Su Lorentin (service full) applicare fascia A listino 2026.",
    spareParts: [
      {
        code: "VLM-400-030",
        description: "Sensore di finecorsa induttivo M12",
      },
    ],
    frequency: 2,
    sourceTicketId: "SRV-2847",
    consolidated: false,
    createdLabel: "28 mar",
    createdFull: "28 mar 2026",
    updatedFull: "28 mar 2026",
    tags: ["finecorsa", "sensore", "m12", "plc", "lorentin"],
  },
  {
    id: "KB-107",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1389",
    problemCategory: "ricambio",
    symptom:
      "Tappeto modulare nastro alimentazione usurato — richiesta prezzo al metro.",
    probableCause:
      "Fine vita utile tappeto Intralox 900 SERIES (passo 25,4 acetalica, larghezza 300).",
    solution:
      "Quotare VLM-200-002 al metro (listino 2026). Distinta DB_VLM-2200_rev.C / BOM art. 200002 prevede ~24 m. LT 30 gg, giacenza tipica 6 m — ordinare con anticipo.",
    spareParts: [
      {
        code: "VLM-200-002",
        description: "Tappeto modulare passo 25,4 acetalica",
      },
    ],
    frequency: 4,
    consolidated: true,
    createdLabel: "5 apr",
    createdFull: "5 apr 2026",
    updatedFull: "5 apr 2026",
    tags: ["tappeto", "alimentazione", "intralox", "pontenuovo"],
  },
  {
    id: "KB-108",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1301",
    problemCategory: "troubleshooting",
    symptom:
      "Cuscinetto rumoroso lato motore nastro alimentazione.",
    probableCause:
      "Cuscinetto 6205-2RS1 del tamburo motrice in fine vita; possibile gioco sul supporto flangiato UCF 205.",
    solution:
      "Sostituire VLM-CU-6205 (×4 tipico). Se gioco sul supporto, aggiungere VLM-200-011. Contratto service full su matr. 1301 (Bobbio).",
    spareParts: [
      {
        code: "VLM-CU-6205",
        description: "Cuscinetto rigido a sfere 6205-2RS1",
      },
      {
        code: "VLM-200-011",
        description: "Supporto flangiato UCF 205",
      },
    ],
    frequency: 3,
    consolidated: false,
    createdLabel: "18 apr",
    createdFull: "18 apr 2026",
    updatedFull: "18 apr 2026",
    tags: ["cuscinetto", "6205", "nastro", "alimentazione"],
  },
  {
    id: "KB-109",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1441",
    problemCategory: "troubleshooting",
    symptom:
      "Testata nastrante superiore non taglia più bene il nastro.",
    probableCause:
      "Usura testata Siat AS-50-U e/o lame LM-50-INOX consumate.",
    solution:
      "Valutare sostituzione VLM-500-001. Sempre affiancare VLM-500-011 (min. 2 pz). Optional visione artificiale sulla 1441 non influenza il ricambio testata.",
    spareParts: [
      {
        code: "VLM-500-001",
        description: "Testata nastrante superiore 50 mm",
      },
      { code: "VLM-500-011", description: "Lama di taglio nastro" },
    ],
    frequency: 2,
    consolidated: false,
    createdLabel: "2 mag",
    createdFull: "2 mag 2026",
    updatedFull: "2 mag 2026",
    tags: ["testata", "nastrante", "siat", "torrefazione sud"],
  },
  {
    id: "KB-110",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1462",
    problemCategory: "troubleshooting",
    symptom:
      "Serratura porta protezione non dà consenso / macchina in emergenza sicurezza.",
    probableCause:
      "Serratura RFID XCSDMR79M12 guasta o cablaggio interrotto — componente di sicurezza non sostituibile con equivalenti.",
    solution:
      "Sostituire solo VLM-100-031 (Schneider). Non accettare equivalenti. LT listino 25 gg, giacenza tipica 3. Verificare consenso porte dopo montaggio.",
    spareParts: [
      {
        code: "VLM-100-031",
        description: "Serratura di sicurezza porta con RFID",
      },
    ],
    frequency: 2,
    consolidated: false,
    createdLabel: "14 mag",
    createdFull: "14 mag 2026",
    updatedFull: "14 mag 2026",
    tags: ["sicurezza", "serratura", "rfid", "consenso", "lorentin"],
  },
  {
    id: "KB-111",
    machineModel: "Incartonatrice VLM-1800",
    machineSerial: "0944",
    problemCategory: "ricambio",
    symptom:
      "Pattino di spinta consumato — ne servono 2 pezzi.",
    probableCause:
      "Usura pattino POM su gruppo spinta (identico a VLM 1600 / 1800 — verificare a ogni tagliando).",
    solution:
      "Ordinare VLM-400-022 × 2. Su VLM 1800 il gruppo spinta segue distinta VLM 1600 (nota parco: gr. spinta invariato). Contratto service base su matr. 0944 (Marenghi).",
    spareParts: [
      {
        code: "VLM-400-022",
        description: "Pattino di spinta in POM",
      },
    ],
    frequency: 4,
    consolidated: true,
    createdLabel: "22 mag",
    createdFull: "22 mag 2026",
    updatedFull: "3 giu 2026",
    tags: ["pattino", "spinta", "pom", "vlm-1800", "marenghi"],
  },
  {
    id: "KB-112",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1412",
    problemCategory: "manutenzione",
    symptom:
      "Pianificazione kit manutenzione 8.000 ore / fermo estivo.",
    probableCause:
      "Intervento preventivo secondo piano OEM — non guasto attivo.",
    solution:
      "Proporre VLM-KIT-8000H. Se il cliente rifiuta (storico OFF/persa), annotare e riproporsi al prossimo fermo. Alternativa: kit 2.000 h VLM-KIT-2000H + pezzi usura prioritari (ventose, cinghia, lame).",
    spareParts: [
      {
        code: "VLM-KIT-8000H",
        description: "Kit manutenzione 8.000 ore VLM 2200",
      },
      {
        code: "VLM-KIT-2000H",
        description: "Kit manutenzione 2.000 ore VLM 2200",
      },
    ],
    frequency: 5,
    consolidated: true,
    createdLabel: "6 giu",
    createdFull: "6 giu 2026",
    updatedFull: "24 giu 2026",
    tags: ["kit 8000", "manutenzione", "preventiva", "nutrilab"],
  },
  {
    id: "KB-113",
    machineModel: "Incartonatrice VLM-1800",
    machineSerial: "1187",
    problemCategory: "troubleshooting",
    symptom:
      "Cinghia gruppo spinta rotta su VLM 1800 (lunghezza 1950, non 2250).",
    probableCause:
      "Usura cinghia AT10 L=1950 — su 1600/1800 usare VLM-400-009/1 (rinforzata), non la /2 da 2250 del 2200.",
    solution:
      "Non quotare VLM-400-009 (fuori produzione). Usare VLM-400-009/1 che sostituisce il vecchio codice. Verificare matricola sul Parco_installato prima di ordinare.",
    spareParts: [
      {
        code: "VLM-400-009/1",
        description: "Cinghia dentata AT10 L=1950 h.25 rinforzata",
      },
    ],
    frequency: 3,
    consolidated: true,
    createdLabel: "12 giu",
    createdFull: "12 giu 2026",
    updatedFull: "12 giu 2026",
    tags: ["cinghia", "1950", "vlm-1800", "sostitutivo"],
  },
  {
    id: "KB-114",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1432",
    problemCategory: "manutenzione",
    symptom:
      "Motoriduttore nastro alimentazione rumoroso / gioco in avviamento.",
    probableCause:
      "Usura motoriduttore Bonfiglioli 0,37 kW i=25 (MVF 49/P).",
    solution:
      "Sostituire VLM-200-019. LT listino 20 gg, giacenza tipica 2. Dopo montaggio verificare senso di rotazione e tensionamento tappeto.",
    spareParts: [
      {
        code: "VLM-200-019",
        description: "Motoriduttore 0,37 kW i=25",
      },
    ],
    frequency: 2,
    consolidated: false,
    createdLabel: "20 giu",
    createdFull: "20 giu 2026",
    updatedFull: "20 giu 2026",
    tags: ["motoriduttore", "bonfiglioli", "alimentazione"],
  },
  {
    id: "KB-115",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1389",
    problemCategory: "altro",
    symptom:
      "Cliente chiede conferma codice ricambio cinghia spinta dal Catalogo / Listino 2026.",
    probableCause:
      "Confusione tra VLM-400-009 (obsoleta), /1 (1950 per 1600/1800) e /2 (2250 per 2200).",
    solution:
      "Per VLM 2200 quotare solo VLM-400-009/2. Citare Listino_ricambi_Vallmec_2026 e distinta DB VLM-2200 rev.C. Non proporre equivalenti Gates non a listino.",
    spareParts: [
      {
        code: "VLM-400-009/2",
        description: "Cinghia dentata AT10 L=2250 h.25",
      },
    ],
    frequency: 7,
    consolidated: true,
    mergedFromIds: ["KB-101"],
    createdLabel: "1 lug",
    createdFull: "1 lug 2026",
    updatedFull: "15 lug 2026",
    tags: ["codice ricambio", "identificazione", "listino", "cinghia"],
  },
  {
    id: "KB-116",
    machineModel: "Incartonatrice VLM-2200",
    machineSerial: "1418",
    problemCategory: "altro",
    symptom:
      "Follow-up Offerta_2026-0417_Fontanini — allineamento prezzi listino 2026 fascia C.",
    probableCause:
      "Nessun contratto service sulla 1418 (fascia C) — prezzi da aggiornare rispetto a offerta precedente.",
    solution:
      "Ricalcolare righe offerta con Listino ricambi Vallmec 2026 (netto fascia C). Per ventose VLM-300-004 usare prezzo usura aggiornato. Confermare disponibilità magazzino prima di reinvio PDF.",
    spareParts: [
      {
        code: "VLM-300-004",
        description: "Ventosa a soffietto D.50 NBR",
      },
    ],
    frequency: 1,
    consolidated: false,
    createdLabel: "15 lug",
    createdFull: "15 lug 2026",
    updatedFull: "15 lug 2026",
    tags: ["offerta", "listino 2026", "fontanini", "fascia c"],
  },
];

/** Serializza la KB per il system prompt dell'agente chat. */
export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) {
    return "=== BASE DI CONOSCENZA TROUBLESHOOTING ===\n(nessuna voce ancora — i ticket chiusi con soluzione la arricchiranno)";
  }
  return entries
    .map((e) => {
      const parts =
        e.spareParts.length > 0
          ? e.spareParts.map((p) => `${p.code}: ${p.description}`).join("; ")
          : "nessuno";
      return [
        `[${e.id}] ${e.machineModel}${e.machineSerial ? ` / ${e.machineSerial}` : ""}`,
        `  Categoria: ${PROBLEM_CATEGORY_LABELS[e.problemCategory]}`,
        `  Sintomo: ${e.symptom}`,
        `  Causa probabile: ${e.probableCause}`,
        `  Soluzione: ${e.solution}`,
        `  Ricambi: ${parts}`,
        `  Frequenza storica: ${e.frequency} occorrenze`,
        `  Tag: ${e.tags.join(", ")}`,
      ].join("\n");
    })
    .join("\n\n")
    .replace(
      /^/,
      "=== BASE DI CONOSCENZA TROUBLESHOOTING VALLMEC / VLM (appresa dagli interventi) ===\n"
    );
}
