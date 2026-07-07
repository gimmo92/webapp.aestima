import type { Machine } from "./types";

// =============================================================
// DATI DI ESEMPIO (MOCK)
// -------------------------------------------------------------
// Questi dati simulano l'anagrafica macchine + distinte base (BOM)
// che in produzione arriverebbero da ERP / gestionale / PLM.
//
// COME SOSTITUIRLI:
//  - Ogni macchina ha un `serial` (matricola) univoco.
//  - `bom` è la distinta: ogni componente ha `code`, `description`,
//    `keywords` (sinonimi con cui il cliente potrebbe descriverlo),
//    `listPrice`, `stock` (giacenza) e `leadTimeDays`.
//  - Il matcher (lib/match.ts) usa `keywords` per collegare il
//    linguaggio naturale del cliente al componente corretto.
// =============================================================

export const MACHINES: Machine[] = [
  {
    serial: "IDC-114-084",
    model: "Impianto IDC 114 TCZ",
    year: 2018,
    category: "Impianti di sollevamento",
    bom: [
      {
        code: "3381200010",
        description: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G (TACCHE)",
        keywords: [
          "curva rinvio",
          "curva di rinvio",
          "rinvio 90",
          "3381200010",
          "curva 114",
        ],
        listPrice: 0,
        bomRef: "3381200010",
        stock: 0,
        leadTimeDays: 12,
      },
      {
        code: "1291200130",
        description: "PERNO CURVA 114 IC TF/TC IN FE -ZINC. A FREDDO",
        keywords: ["perno curva", "perno", "1291200130"],
        listPrice: 245,
        stock: 4,
        leadTimeDays: 0,
      },
      {
        code: "1002033",
        description: "CUSCINETTO A SFERE 6005 2RS (curva rinvio)",
        keywords: ["cuscinetto 6005", "6005 2rs", "1002033"],
        listPrice: 38,
        stock: 10,
        leadTimeDays: 0,
      },
      {
        code: "1381400061_F",
        description: "RUOTA TRAINO 76 TC/114 TCZ 12 PASSI C40 TEMPRATA",
        keywords: [
          "ruota traino",
          "ruota di traino",
          "corona traino",
          "1381400061",
          "traino",
        ],
        listPrice: 0,
        bomRef: "1381400061_F",
        stock: 0,
        leadTimeDays: 15,
      },
      {
        code: "1381400061D",
        description: "CORONA RUOTA TRAINO 76TC/114TCZ, C45",
        keywords: ["corona", "corona traino", "1381400061d"],
        listPrice: 890,
        stock: 1,
        leadTimeDays: 0,
      },
      {
        code: "3051600250_134",
        description: "IDC ASSIEME FUNE 114 I RTP — cavo D.6, dischi D.90",
        keywords: [
          "assieme fune",
          "fune",
          "cavo fune",
          "3051600250",
          "rtp",
          "cavo acciaio",
        ],
        listPrice: 0,
        bomRef: "3051600250_134",
        stock: 0,
        leadTimeDays: 8,
      },
      {
        code: "1023021",
        description: "Cavo ferro zincato mm 6 SEALE IWRC SGRASSATO S2-d6",
        keywords: ["cavo", "1023021", "metri cavo", "fune zincata"],
        listPrice: 3.8,
        stock: 0,
        leadTimeDays: 5,
      },
    ],
  },
  {
    serial: "MX-4521",
    model: "Rettificatrice RX-400",
    year: 2019,
    category: "Rettificatrici cilindriche",
    bom: [
      {
        code: "SL-2201-VT",
        description: "Anello di tenuta mandrino (guarnizione Viton Ø45)",
        keywords: [
          "tenuta",
          "componente di tenuta",
          "guarnizione",
          "anello",
          "paraolio",
          "seal",
          "o-ring",
        ],
        listPrice: 148.0,
        stock: 6,
        leadTimeDays: 0,
      },
      {
        code: "CB-8890-A",
        description: "Cinghia trasmissione mandrino dentata HTD-8M",
        keywords: ["cinghia", "trasmissione", "belt", "puleggia"],
        listPrice: 92.5,
        stock: 0,
        leadTimeDays: 7,
      },
      {
        code: "BR-1140-C4",
        description: "Cuscinetto obliquo a sfere 7014 (precisione P4)",
        keywords: ["cuscinetto", "bearing", "sfere", "supporto albero"],
        listPrice: 310.0,
        stock: 2,
        leadTimeDays: 0,
      },
    ],
  },
  {
    serial: "TC-7788",
    model: "Tornio CNC TC-220",
    year: 2021,
    category: "Torni a controllo numerico",
    bom: [
      {
        code: "PM-5502-EL",
        description: "Pompa refrigerante 0,75 kW 400V trifase",
        keywords: [
          "pompa",
          "refrigerante",
          "liquido",
          "raffreddamento",
          "coolant",
        ],
        listPrice: 435.0,
        stock: 1,
        leadTimeDays: 0,
      },
      {
        code: "SN-3310-IX",
        description: "Sensore induttivo di finecorsa asse X (M12 PNP)",
        keywords: ["sensore", "finecorsa", "induttivo", "prossimità", "switch"],
        listPrice: 78.0,
        stock: 0,
        leadTimeDays: 5,
      },
      {
        code: "GT-2075-HY",
        description: "Guarnizione idraulica stelo pistone contropunta",
        keywords: ["guarnizione", "tenuta", "idraulica", "pistone", "seal"],
        listPrice: 64.5,
        stock: 8,
        leadTimeDays: 0,
      },
    ],
  },
  {
    serial: "FR-3092",
    model: "Fresatrice FZ-500",
    year: 2017,
    category: "Centri di fresatura",
    bom: [
      {
        code: "EL-9001-DR",
        description: "Elettromandrino 12.000 rpm attacco ISO40",
        keywords: ["mandrino", "elettromandrino", "spindle", "testa"],
        listPrice: 4250.0,
        stock: 0,
        leadTimeDays: 21,
      },
      {
        code: "FL-4420-AC",
        description: "Filtro aria compressa in linea 3/8'' con separatore",
        keywords: ["filtro", "aria", "compressa", "separatore"],
        listPrice: 54.0,
        stock: 12,
        leadTimeDays: 0,
      },
      {
        code: "TN-6612-VT",
        description: "Kit tenute pneumatiche cambio utensile automatico",
        keywords: [
          "tenuta",
          "tenute",
          "guarnizione",
          "pneumatica",
          "cambio utensile",
          "seal",
        ],
        listPrice: 189.0,
        stock: 3,
        leadTimeDays: 0,
      },
    ],
  },
];

/**
 * Richiesta cliente di esempio, precompilata e modificabile nell'UI.
 * Volutamente vaga e in linguaggio naturale, senza codici ricambio.
 */
export const SAMPLE_REQUEST =
  "Buongiorno, si è rotto il componente di tenuta sulla macchina che abbiamo " +
  "comprato nel 2019, numero di serie MX-4521. Ci serve un preventivo urgente.";

/** Dati azienda fittizi per la carta intestata del preventivo. */
export const COMPANY = {
  name: "Aestima S.r.l.",
  tagline: "Ricambi industriali & assistenza tecnica",
  address: "Via dell'Industria 42, 36100 Vicenza (VI)",
  vat: "P.IVA IT0 4821570248",
  email: "preventivi@aestima.demo",
  phone: "+39 0444 000 000",
};
