import type { KnowledgeEntry, ProblemCategory } from "./knowledgeTypes";

// =============================================================
// DATI MOCK — knowledge base troubleshooting
// In produzione: DB persistente, alimentato da storico interventi
// reale e indicizzato per ricerca semantica (embedding/vector store).
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
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    problemCategory: "troubleshooting",
    symptom:
      "Rumore metallico intermittente dalla curva di rinvio durante il sollevamento, soprattutto a carico pieno.",
    probableCause:
      "Usura del cuscinetto a sfere 6005 2RS sulla curva di rinvio e/o gioco sul perno curva.",
    solution:
      "Ispezionare cuscinetto 6005 2RS (cod. 1002033) e perno curva 1291200130. Sostituire il cuscinetto se presenta gioco o segni di usura. Regreasing del perno e verifica allineamento curva dopo il montaggio.",
    spareParts: [
      { code: "1002033", description: "CUSCINETTO A SFERE 6005 2RS" },
      { code: "1291200130", description: "PERNO CURVA 114 IC TF/TC" },
    ],
    frequency: 4,
    consolidated: true,
    createdLabel: "15 gen",
    createdFull: "15 gen 2025",
    updatedFull: "2 apr 2025",
    tags: ["rumore", "curva rinvio", "cuscinetto", "6005", "metallico"],
  },
  {
    id: "KB-102",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    problemCategory: "troubleshooting",
    symptom:
      "Slittamento della fune sul semidisco di giunzione con perdita di tensione dopo pochi cicli.",
    probableCause:
      "Usura del semidisco di giunzione e/o boccola di blocco danneggiata; tensione fune non conforme.",
    solution:
      "Controllare usura semidisco 1051600230 e boccola blocco 1011600070. Sostituire semidisco se solchi > 1 mm. Ritesare la fune secondo procedura IDC-114-RTP-03 (coppia 180 Nm sul tappo di blocco).",
    spareParts: [
      { code: "1051600230", description: "SEMIDISCO GIUNZIONE IDC 114" },
      { code: "1011600070", description: "BOCCOLA DI BLOCCAGGIO IN PR 80 Zn" },
    ],
    frequency: 2,
    consolidated: false,
    createdLabel: "22 feb",
    createdFull: "22 feb 2025",
    updatedFull: "22 feb 2025",
    tags: ["fune", "slittamento", "tensione", "semidisco"],
  },
  {
    id: "KB-103",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-112",
    problemCategory: "troubleshooting",
    symptom:
      "Errore E-47 sul pannello: tensione fune fuori range dopo sostituzione cavo.",
    probableCause:
      "Calibrazione sensore tensione non eseguita dopo cambio cavo; anello di blocco montato al contrario.",
    solution:
      "Dopo cambio cavo D.8 (1023021-08) ricalibrare: menu Service → Fune → Calibrazione. Impostare diametro 8 mm e lunghezza effettiva. Verificare montaggio anello blocco 1011600080.",
    spareParts: [
      { code: "1023021-08", description: "Cavo ferro zincato mm 8" },
      { code: "1011600080", description: "ANELLO DI BLOCCAGGIO IN PN 80 Zn" },
    ],
    frequency: 3,
    consolidated: false,
    createdLabel: "8 mar",
    createdFull: "8 mar 2025",
    updatedFull: "8 mar 2025",
    tags: ["errore e-47", "tensione", "calibrazione", "fune"],
  },
  {
    id: "KB-104",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    problemCategory: "troubleshooting",
    symptom:
      "Perdita olio dal mandrino con gocciolamento visibile sotto la testa rettifica.",
    probableCause:
      "Tenuta mandrino usurata o sede contaminata; possibile micro-righe sull'albero.",
    solution:
      "Sostituire anello tenuta SL-2201-VT (Viton Ø45). Pulire sede e verificare assenza di righe sull'albero mandrino prima del montaggio. Se persiste dopo 48h, ispezionare accoppiamento mandrino.",
    spareParts: [
      {
        code: "SL-2201-VT",
        description: "Anello di tenuta mandrino (guarnizione Viton Ø45)",
      },
    ],
    frequency: 5,
    consolidated: true,
    createdLabel: "12 mar",
    createdFull: "12 mar 2025",
    updatedFull: "13 mar 2025",
    tags: ["perdita olio", "mandrino", "tenuta", "guarnizione"],
  },
  {
    id: "KB-105",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    problemCategory: "troubleshooting",
    symptom:
      "Vibrazione anomala del mandrino a 3000 rpm, pezzo non rettificato entro tolleranza.",
    probableCause:
      "Cuscinetto mandrino con gioco eccessivo e/o cinghia trasmissione usurata.",
    solution:
      "Verificare cuscinetto BR-1140-C4 (7014 P4) e cinghia CB-8890-A. Sostituire entrambi se usurati. Bilanciamento mandrino solo se la vibrazione persiste dopo sostituzione ricambi.",
    spareParts: [
      {
        code: "BR-1140-C4",
        description: "Cuscinetto obliquo a sfere 7014 (P4)",
      },
      {
        code: "CB-8890-A",
        description: "Cinghia trasmissione mandrino dentata HTD-8M",
      },
    ],
    frequency: 2,
    consolidated: false,
    createdLabel: "20 mar",
    createdFull: "20 mar 2025",
    updatedFull: "20 mar 2025",
    tags: ["vibrazione", "mandrino", "cuscinetto", "cinghia"],
  },
  {
    id: "KB-106",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    problemCategory: "troubleshooting",
    symptom:
      "Vibrazione anomala durante il sollevamento a metà corsa, con oscillazione visibile del carico.",
    probableCause:
      "Disallineamento curva di rinvio 3381200010, usura asimmetrica corona traino 1381400061D o gioco sul perno curva 1291200130.",
    solution:
      "Verificare allineamento curva rinvio con laser o filo a piombo. Ispezionare corona traino per denti usurati o ovalizzazione. Controllare perno curva e cuscinetto 6005 2RS (1002033). Sostituire i componenti usurati e rieseguire prova a vuoto prima del carico pieno.",
    spareParts: [
      { code: "3381200010", description: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G" },
      { code: "1381400061D", description: "CORONA RUOTA TRAINO 76TC/114TCZ, C45" },
      { code: "1291200130", description: "PERNO CURVA 114 IC TF/TC" },
      { code: "1002033", description: "CUSCINETTO A SFERE 6005 2RS" },
    ],
    frequency: 3,
    sourceTicketId: "SRV-7454",
    consolidated: true,
    createdLabel: "28 mar",
    createdFull: "28 mar 2025",
    updatedFull: "15 apr 2025",
    tags: ["vibrazione", "curva rinvio", "corona traino", "allineamento"],
  },
  {
    id: "KB-107",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    problemCategory: "ricambio",
    symptom:
      "Richiesta sostituzione cavo fune D.6 per raggiungimento ore di lavoro programmate.",
    probableCause:
      "Fine vita utile cavo secondo piano manutenzione IDC-114-RTP-03 (sostituzione ogni 18 mesi o 12.000 cicli).",
    solution:
      "Ordinare cavo ferro zincato mm 6 (1023021) in metratura necessaria. Smontare semidisco giunzione, sostituire cavo seguendo schema avvolgimento dischi. Ritesare a 180 Nm e verificare conteggio giri con targa di collaudo.",
    spareParts: [
      { code: "1023021", description: "Cavo ferro zincato mm 6 SEALE IWRC SGRASSATO" },
      { code: "1051600230", description: "SEMIDISCO GIUNZIONE IDC 114 OLEFINICA" },
      { code: "1011600070", description: "BOCCOLA DI BLOCCAGGIO IN PR 80 Zn" },
    ],
    frequency: 6,
    consolidated: true,
    createdLabel: "5 apr",
    createdFull: "5 apr 2025",
    updatedFull: "5 apr 2025",
    tags: ["cavo fune", "sostituzione programmata", "manutenzione", "d.6"],
  },
  {
    id: "KB-108",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    problemCategory: "manutenzione",
    symptom:
      "Pianificazione manutenzione ordinaria semestrale su curva di rinvio e punti di lubrificazione.",
    probableCause:
      "Intervento preventivo secondo checklist OEM IDC-114-MNT-01 — non legato a guasto attivo.",
    solution:
      "Eseguire ingrassaggio perno curva (grasso EP2), controllo visivo cuscinetto 6005 2RS, verifica fissaggio bulloneria curva 3381200010. Annotare ore macchina e prossima scadenza su registro manutenzione.",
    spareParts: [{ code: "1002033", description: "CUSCINETTO A SFERE 6005 2RS (riserva)" }],
    frequency: 2,
    consolidated: false,
    createdLabel: "18 apr",
    createdFull: "18 apr 2025",
    updatedFull: "18 apr 2025",
    tags: ["manutenzione ordinaria", "lubrificazione", "preventiva", "curva rinvio"],
  },
  {
    id: "KB-109",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-112",
    problemCategory: "troubleshooting",
    symptom:
      "Allarme surriscaldamento motore principale dopo 20 minuti di utilizzo continuo.",
    probableCause:
      "Ventilazione motore ostruita da polvere, carico eccessivo per tensione fune non calibrata, o cuscinetto motore in fase di usura.",
    solution:
      "Pulire griglia ventilazione e verificare assorbimento a vuoto. Controllare calibrazione tensione fune (menu Service → Fune). Se assorbimento > 15% rispetto a targa, ispezionare cuscinetti motore e riduttore. Ripristinare ventilazione prima di riavvio.",
    spareParts: [],
    frequency: 1,
    consolidated: false,
    createdLabel: "2 mag",
    createdFull: "2 mag 2025",
    updatedFull: "2 mag 2025",
    tags: ["surriscaldamento", "motore", "allarme", "ventilazione"],
  },
  {
    id: "KB-110",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-112",
    problemCategory: "troubleshooting",
    symptom:
      "Rumore sordo e battito ritmico dalla curva di rinvio in fase di discesa del carico.",
    probableCause:
      "Dente corona traino 1381400061D danneggiato o corpo estraneo incastrato tra corona e fune.",
    solution:
      "Fermare impianto e ispezionare corona traino e canalina fune. Rimuovere eventuali detriti. Se dente corona presenta scheggiature, sostituire corona 1381400061D e verificare accoppiamento con ruota motrice prima della messa in servizio.",
    spareParts: [
      { code: "1381400061D", description: "CORONA RUOTA TRAINO 76TC/114TCZ, C45" },
    ],
    frequency: 2,
    sourceTicketId: "SRV-7312",
    consolidated: false,
    createdLabel: "14 mag",
    createdFull: "14 mag 2025",
    updatedFull: "14 mag 2025",
    tags: ["rumore", "corona traino", "discesa", "battito"],
  },
  {
    id: "KB-111",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-112",
    problemCategory: "ricambio",
    symptom:
      "Necessità di ordinare semidisco giunzione RT D.100 per usura visibile dei solchi.",
    probableCause:
      "Solchi semidisco oltre 1,2 mm di profondità — limite massimo ammesso da procedura IDC-114-RT-02.",
    solution:
      "Sostituire semidisco 1051600240 e boccola/anello blocco 1011600080 se deformati. Ritesare fune D.8 dopo montaggio. Eseguire 10 cicli a vuoto prima del carico nominale.",
    spareParts: [
      { code: "1051600240", description: "SEMIDISCO GIUNZIONE IDC 114 RT — D.100" },
      { code: "1011600080", description: "ANELLO DI BLOCCAGGIO IN PN 80 Zn" },
    ],
    frequency: 4,
    consolidated: true,
    createdLabel: "22 mag",
    createdFull: "22 mag 2025",
    updatedFull: "3 giu 2025",
    tags: ["semidisco", "giunzione", "usura", "rt d.100"],
  },
  {
    id: "KB-112",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    problemCategory: "troubleshooting",
    symptom:
      "Pompa refrigerante mandrino non carica pressione, messaggio 'Flusso insufficiente' sul display.",
    probableCause:
      "Filtro olio FL-3301-AB intasato, livello refrigerante basso, o pompa PM-8800-RX con girante ostruita.",
    solution:
      "Verificare livello serbatoio refrigerante. Sostituire filtro FL-3301-AB. Se pressione < 2 bar, smontare e pulire pre-filtro aspirazione pompa PM-8800-RX. In caso di persistenza, sostituire pompa.",
    spareParts: [
      { code: "FL-3301-AB", description: "Filtro olio mandrino cartuccia 10 µm" },
      { code: "PM-8800-RX", description: "Pompa refrigerante mandrino 0,55 kW" },
    ],
    frequency: 3,
    consolidated: false,
    createdLabel: "6 giu",
    createdFull: "6 giu 2025",
    updatedFull: "6 giu 2025",
    tags: ["pompa", "refrigerante", "pressione", "flusso insufficiente"],
  },
  {
    id: "KB-113",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    problemCategory: "manutenzione",
    symptom:
      "Sostituzione programmata filtro olio mandrino e controllo livello refrigerante trimestrale.",
    probableCause:
      "Manutenzione preventiva secondo piano RX-400-MNT-Q — non sintomo di guasto.",
    solution:
      "Sostituire cartuccia FL-3301-AB, verificare assenza acqua nel refrigerante (test kit RX-CHK-01), rabboccare se necessario. Registrare intervento nel registro macchina.",
    spareParts: [
      { code: "FL-3301-AB", description: "Filtro olio mandrino cartuccia 10 µm" },
    ],
    frequency: 5,
    consolidated: true,
    createdLabel: "12 giu",
    createdFull: "12 giu 2025",
    updatedFull: "12 giu 2025",
    tags: ["manutenzione", "filtro olio", "preventiva", "refrigerante"],
  },
  {
    id: "KB-114",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    problemCategory: "troubleshooting",
    symptom:
      "Mandrino non raggiunge la velocità nominale, rampa di accelerazione anomala con ronzio.",
    probableCause:
      "Cinghia CB-8890-A allentata o usurata, tensione cinghia fuori specifica, variatore frequenza in derating termico.",
    solution:
      "Misurare tensione cinghia HTD-8M (valore nominale 280 N). Sostituire cinghia CB-8890-A se denti consumati o allungamento > 3%. Verificare ventilazione quadro e temperatura ambiente < 35 °C.",
    spareParts: [
      {
        code: "CB-8890-A",
        description: "Cinghia trasmissione mandrino dentata HTD-8M",
      },
    ],
    frequency: 2,
    consolidated: false,
    createdLabel: "20 giu",
    createdFull: "20 giu 2025",
    updatedFull: "20 giu 2025",
    tags: ["mandrino", "velocità", "cinghia", "accelerazione"],
  },
  {
    id: "KB-115",
    machineModel: "Impianto IDC 114 TCZ",
    machineSerial: "IDC-114-084",
    problemCategory: "altro",
    symptom:
      "Richiesta documentazione procedura di collaudo post-intervento su curva di rinvio sostituita.",
    probableCause:
      "Necessità operativa post-sostituzione componente critico — non guasto meccanico.",
    solution:
      "Fornire al cliente checklist IDC-114-COL-04: prova a vuoto 50 cicli, verifica allineamento, misura tensione fune, firma tecnico abilitato. Archiviare report in cartella intervento.",
    spareParts: [],
    frequency: 1,
    consolidated: false,
    createdLabel: "25 giu",
    createdFull: "25 giu 2025",
    updatedFull: "25 giu 2025",
    tags: ["documentazione", "collaudo", "procedura", "post-intervento"],
  },
  {
    id: "KB-116",
    machineModel: "Rettificatrice RX-400",
    machineSerial: "MX-4521",
    problemCategory: "altro",
    symptom:
      "Cliente segnala difficoltà nell'identificare il codice ricambio per la tenuta mandrino.",
    probableCause:
      "Distinta macchina non consultata — codice tenuta standard per variante mandrino 400 mm.",
    solution:
      "Comunicare codice SL-2201-VT (anello tenuta Viton Ø45) dalla distinta RX-400. Verificare matricola MX-4521 per conferma compatibilità. Proporre ordine con disponibilità a magazzino (6 pz).",
    spareParts: [
      {
        code: "SL-2201-VT",
        description: "Anello di tenuta mandrino (guarnizione Viton Ø45)",
      },
    ],
    frequency: 7,
    consolidated: true,
    mergedFromIds: ["KB-104"],
    createdLabel: "1 lug",
    createdFull: "1 lug 2025",
    updatedFull: "10 lug 2025",
    tags: ["codice ricambio", "tenuta", "identificazione", "distinta"],
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
    .replace(/^/, "=== BASE DI CONOSCENZA TROUBLESHOOTING (appresa dagli interventi) ===\n");
}
