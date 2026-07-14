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
