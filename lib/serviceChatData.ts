// =============================================================
// DATI DI ESEMPIO — Chat assistenza service after-sales
// -------------------------------------------------------------
// In produzione questi dati verrebbero sostituiti dal catalogo
// macchine/distinte reali del cliente (ERP/PLM) e dallo storico
// interventi risolti (ticketing/CMMS). Per cambiare cliente basta
// sostituire questo file (o collegarlo a un'API interna).
// =============================================================

export interface ServiceSparePart {
  code: string;
  description: string;
  /** Prezzo di listino EUR */
  price: number;
  /** Giacenza a magazzino (0 = da ordinare) */
  stock: number;
  /** Giorni lavorativi se stock = 0 */
  leadTimeDays: number;
  /** Sinonimi con cui il cliente potrebbe descrivere il pezzo */
  keywords: string[];
}

export interface ServiceMachine {
  id: string;
  model: string;
  /** Matricola univoca */
  serial: string;
  year: number;
  category: string;
  /** Variante/versione — utile per disambiguare modelli omonimi */
  variant: string;
  parts: ServiceSparePart[];
}

export interface TroubleshootingCase {
  id: string;
  /** Modello o matricola di riferimento */
  machineRef: string;
  /** Sintomo descritto dal cliente / operatore */
  symptom: string;
  /** Soluzione applicata e verificata */
  solution: string;
  /** Tag per ricerca semantica */
  tags: string[];
}

/** Anagrafica macchine con distinta base (5-8 componenti ciascuna). */
export const SERVICE_MACHINES: ServiceMachine[] = [
  {
    id: "idc-114-084",
    model: "Impianto IDC 114 TCZ",
    serial: "IDC-114-084",
    year: 2018,
    category: "Impianti di sollevamento",
    variant: "Configurazione RTP — cavo D.6, dischi D.90",
    parts: [
      {
        code: "1291200130",
        description: "PERNO CURVA 114 IC TF/TC IN FE -ZINC. A FREDDO",
        price: 245,
        stock: 4,
        leadTimeDays: 0,
        keywords: ["perno curva", "perno", "1291200130", "perno rinvio"],
      },
      {
        code: "1002033",
        description: "CUSCINETTO A SFERE 6005 2RS (curva rinvio)",
        price: 38,
        stock: 10,
        leadTimeDays: 0,
        keywords: ["cuscinetto 6005", "6005 2rs", "1002033", "cuscinetto curva"],
      },
      {
        code: "1381400061D",
        description: "CORONA RUOTA TRAINO 76TC/114TCZ, C45",
        price: 890,
        stock: 1,
        leadTimeDays: 0,
        keywords: ["corona traino", "ruota traino", "1381400061d", "corona"],
      },
      {
        code: "1023021",
        description: "Cavo ferro zincato mm 6 SEALE IWRC SGRASSATO S2-d6",
        price: 3.8,
        stock: 0,
        leadTimeDays: 5,
        keywords: ["cavo fune", "fune", "1023021", "cavo acciaio", "metri cavo"],
      },
      {
        code: "1011600070",
        description: "BOCCOLA DI BLOCCAGGIO IN PR 80 Zn",
        price: 18,
        stock: 6,
        leadTimeDays: 0,
        keywords: ["boccola blocco", "1011600070", "bloccaggio fune"],
      },
      {
        code: "1051600230",
        description: "SEMIDISCO GIUNZIONE IDC 114 OLEFINICA",
        price: 45,
        stock: 2,
        leadTimeDays: 0,
        keywords: ["semidisco", "giunzione", "1051600230", "disco fune"],
      },
      {
        code: "3381200010",
        description: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G (TACCHE)",
        price: 1850,
        stock: 0,
        leadTimeDays: 12,
        keywords: ["curva rinvio", "rinvio 90", "3381200010", "curva 114"],
      },
    ],
  },
  {
    id: "idc-114-112",
    model: "Impianto IDC 114 TCZ",
    serial: "IDC-114-112",
    year: 2021,
    category: "Impianti di sollevamento",
    variant: "Configurazione RT — cavo D.8, dischi D.100",
    parts: [
      {
        code: "1291200130",
        description: "PERNO CURVA 114 IC TF/TC IN FE -ZINC. A FREDDO",
        price: 245,
        stock: 2,
        leadTimeDays: 0,
        keywords: ["perno curva", "perno", "1291200130"],
      },
      {
        code: "1381400061D",
        description: "CORONA RUOTA TRAINO 76TC/114TCZ, C45",
        price: 890,
        stock: 0,
        leadTimeDays: 15,
        keywords: ["corona traino", "ruota traino", "1381400061d"],
      },
      {
        code: "1023021-08",
        description: "Cavo ferro zincato mm 8 SEALE IWRC SGRASSATO S2-d8",
        price: 5.2,
        stock: 0,
        leadTimeDays: 7,
        keywords: ["cavo fune", "fune", "cavo 8mm", "1023021"],
      },
      {
        code: "1051600240",
        description: "SEMIDISCO GIUNZIONE IDC 114 RT — D.100",
        price: 52,
        stock: 3,
        leadTimeDays: 0,
        keywords: ["semidisco", "giunzione", "1051600240", "disco rt"],
      },
      {
        code: "1011600080",
        description: "ANELLO DI BLOCCAGGIO IN PN 80 Zn",
        price: 22,
        stock: 8,
        leadTimeDays: 0,
        keywords: ["anello blocco", "1011600080", "bloccaggio"],
      },
      {
        code: "3381200010",
        description: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G (TACCHE)",
        price: 1850,
        stock: 0,
        leadTimeDays: 14,
        keywords: ["curva rinvio", "rinvio 90", "3381200010"],
      },
    ],
  },
  {
    id: "mx-4521",
    model: "Rettificatrice RX-400",
    serial: "MX-4521",
    year: 2019,
    category: "Rettificatrici cilindriche",
    variant: "Mandrino 400 mm — versione standard",
    parts: [
      {
        code: "SL-2201-VT",
        description: "Anello di tenuta mandrino (guarnizione Viton Ø45)",
        price: 148,
        stock: 6,
        leadTimeDays: 0,
        keywords: ["tenuta", "guarnizione", "anello", "paraolio", "seal", "o-ring"],
      },
      {
        code: "CB-8890-A",
        description: "Cinghia trasmissione mandrino dentata HTD-8M",
        price: 92.5,
        stock: 0,
        leadTimeDays: 7,
        keywords: ["cinghia", "trasmissione", "belt", "puleggia"],
      },
      {
        code: "BR-1140-C4",
        description: "Cuscinetto obliquo a sfere 7014 (precisione P4)",
        price: 310,
        stock: 2,
        leadTimeDays: 0,
        keywords: ["cuscinetto", "bearing", "7014", "supporto albero"],
      },
      {
        code: "FL-3301-AB",
        description: "Filtro olio mandrino cartuccia 10 µm",
        price: 34,
        stock: 12,
        leadTimeDays: 0,
        keywords: ["filtro olio", "cartuccia", "fl-3301"],
      },
      {
        code: "PM-8800-RX",
        description: "Pompa refrigerante mandrino 0,55 kW",
        price: 385,
        stock: 0,
        leadTimeDays: 10,
        keywords: ["pompa", "refrigerante", "raffreddamento", "coolant"],
      },
    ],
  },
];

/** Base di conoscenza troubleshooting — interventi passati risolti. */
export const TROUBLESHOOTING_KB: TroubleshootingCase[] = [
  {
    id: "ts-001",
    machineRef: "Impianto IDC 114 TCZ / IDC-114-084",
    symptom:
      "Rumore metallico intermittente dalla curva di rinvio durante il sollevamento, soprattutto a carico pieno.",
    solution:
      "Ispezionare cuscinetto 6005 2RS (cod. 1002033) e perno curva 1291200130. In 3 casi su 4 il cuscinetto era usurato: sostituzione cuscinetto + regreasing perno. Verificare allineamento curva dopo il montaggio.",
    tags: ["rumore", "curva rinvio", "cuscinetto", "6005", "metallico"],
  },
  {
    id: "ts-002",
    machineRef: "Impianto IDC 114 TCZ / IDC-114-084",
    symptom:
      "Slittamento della fune sul semidisco di giunzione, perdita di tensione dopo pochi cicli.",
    solution:
      "Controllare usura semidisco 1051600230 e boccola blocco 1011600070. Sostituire semidisco se presenta solchi > 1 mm. Ritesare la fune secondo procedura IDC-114-RTP-03 (coppia 180 Nm sul tappo di blocco).",
    tags: ["fune", "slittamento", "tensione", "semidisco", "giunzione"],
  },
  {
    id: "ts-003",
    machineRef: "Impianto IDC 114 TCZ / IDC-114-112",
    symptom:
      "Errore E-47 sul pannello: 'Tensione fune fuori range' dopo sostituzione cavo.",
    solution:
      "Dopo cambio cavo D.8 (1023021-08) il sensore di tensione va ricalibrato: menu Service → Fune → Calibrazione. Impostare diametro cavo 8 mm e lunghezza effettiva. Se persiste, verificare anello blocco 1011600080 non montato al contrario.",
    tags: ["errore e-47", "tensione", "calibrazione", "fune", "allarme"],
  },
  {
    id: "ts-004",
    machineRef: "Rettificatrice RX-400 / MX-4521",
    symptom:
      "Perdita olio dal mandrino, gocciolamento visibile sotto la testa rettifica durante l'uso.",
    solution:
      "Sostituire anello tenuta SL-2201-VT (Viton Ø45). Prima del montaggio pulire sede e verificare assenza di righe sull'albero mandrino. Se la perdita persiste dopo 48h, aprire ticket per verifica accoppiamento mandrino (possibile usura oltre la tenuta).",
    tags: ["perdita olio", "mandrino", "tenuta", "guarnizione", "gocciolamento"],
  },
  {
    id: "ts-005",
    machineRef: "Rettificatrice RX-400 / MX-4521",
    symptom:
      "Vibrazione anomala mandrino a 3000 rpm, pezzo non rettificato entro tolleranza.",
    solution:
      "Verificare cuscinetto BR-1140-C4 (7014 P4): gioco assiale e radiali. Controllare cinghia CB-8890-A per usura denti. In un caso risolto: cinghia allentata + cuscinetto con gioco eccessivo — sostituzione entrambi. Bilanciamento mandrino solo se persiste dopo sostituzione ricambi.",
    tags: ["vibrazione", "mandrino", "cuscinetto", "cinghia", "tolleranza"],
  },
];

/** Serializza i dati di contesto per il system prompt dell'agente. */
export function buildServiceContext(): string {
  const machinesBlock = SERVICE_MACHINES.map((m) => {
    const partsList = m.parts
      .map((p) => {
        const avail =
          p.stock > 0
            ? `disponibile (${p.stock} pz)`
            : `da ordinare (${p.leadTimeDays} gg)`;
        return `    - ${p.code}: ${p.description} | €${p.price} | ${avail}`;
      })
      .join("\n");
    return [
      `Macchina: ${m.model}`,
      `  Matricola: ${m.serial}`,
      `  Anno: ${m.year} | Categoria: ${m.category}`,
      `  Variante: ${m.variant}`,
      `  Distinta base:`,
      partsList,
    ].join("\n");
  }).join("\n\n");

  const kbBlock = TROUBLESHOOTING_KB.map(
    (c) =>
      `[${c.id}] ${c.machineRef}\n  Problema: ${c.symptom}\n  Soluzione: ${c.solution}`
  ).join("\n\n");

  return `=== ANAGRAFICA MACCHINE E DISTINTE ===\n${machinesBlock}\n\n=== BASE DI CONOSCENZA TROUBLESHOOTING ===\n${kbBlock}`;
}
