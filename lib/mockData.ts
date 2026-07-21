import type { BomComponent, Machine } from "./types";

// =============================================================
// Anagrafica macchine + BOM — seed demo company "spark"
// Sorgente: Desktop/dummy data demo (Vallmec parco + listino + DB VLM-2200)
// =============================================================

const VLM_2200_BOM: BomComponent[] = [
  {
    code: "VLM-CU-6205",
    description: "Cuscinetto rigido a sfere 6205-2RS1",
    keywords: [
      "cuscinetto 6205",
      "6205-2rs",
      "6205 2rs",
      "cuscinetto nastro",
      "cuscinetto alimentazione",
    ],
    listPrice: 7.03,
    stock: 62,
    leadTimeDays: 5,
  },
  {
    code: "VLM-200-011",
    description: "Supporto flangiato UCF 205",
    keywords: ["supporto flangiato", "ucf 205", "supporto nastro"],
    listPrice: 18.71,
    stock: 14,
    leadTimeDays: 5,
  },
  {
    code: "VLM-200-002",
    description: "Tappeto modulare passo 25,4 acetalica",
    keywords: [
      "tappeto modulare",
      "tappeto alimentazione",
      "nastro modulare",
      "intralox",
      "passo 25",
    ],
    listPrice: 136.3,
    stock: 6,
    leadTimeDays: 30,
  },
  {
    code: "VLM-200-019",
    description: "Motoriduttore 0,37 kW i=25",
    keywords: ["motoriduttore", "0,37 kw", "bonfiglioli", "motore nastro"],
    listPrice: 345.1,
    stock: 2,
    leadTimeDays: 20,
  },
  {
    code: "VLM-200-040",
    description: "Fotocellula presenza prodotto E3Z-D62",
    keywords: [
      "fotocellula",
      "e3z-d62",
      "fotocellula presenza",
      "sensore presenza prodotto",
    ],
    listPrice: 62.78,
    stock: 9,
    leadTimeDays: 10,
  },
  {
    code: "VLM-100-031",
    description: "Serratura di sicurezza porta con RFID",
    keywords: [
      "serratura di sicurezza",
      "serratura rfid",
      "blocco porta",
      "sicurezza porta",
    ],
    listPrice: 286.2,
    stock: 3,
    leadTimeDays: 25,
  },
  {
    code: "VLM-300-004",
    description: "Ventosa a soffietto D.50 NBR",
    keywords: [
      "ventosa",
      "ventosa soffietto",
      "soffietto d.50",
      "ventose fustellato",
      "presa fustellati",
    ],
    listPrice: 19.04,
    stock: 34,
    leadTimeDays: 7,
  },
  {
    code: "VLM-300-005",
    description: "Generatore di vuoto",
    keywords: ["generatore di vuoto", "vuoto", "eiettore", "festo vn"],
    listPrice: 84.1,
    stock: 4,
    leadTimeDays: 12,
  },
  {
    code: "VLM-300-012",
    description: "Cilindro pneumatico D.32 corsa 100",
    keywords: [
      "cilindro pneumatico",
      "cilindro d.32",
      "attuatore pneumatico",
      "dsbc-32",
    ],
    listPrice: 98.6,
    stock: 7,
    leadTimeDays: 12,
  },
  {
    code: "VLM-400-003",
    description: "Guida lineare a ricircolo di sfere HGR20R",
    keywords: ["guida lineare", "hgr20", "ricircolo di sfere", "binario lineare"],
    listPrice: 234.9,
    stock: 3,
    leadTimeDays: 35,
  },
  {
    code: "VLM-400-004",
    description: "Pattino guida lineare HGH20CA",
    keywords: ["pattino guida", "hgh20", "carrello lineare"],
    listPrice: 121.8,
    stock: 8,
    leadTimeDays: 35,
  },
  {
    code: "VLM-400-009/2",
    description: "Cinghia dentata AT10 L=2250 h.25",
    keywords: [
      "cinghia dentata",
      "cinghia at10",
      "cinghia spinta",
      "cinghia 2250",
    ],
    listPrice: 69.7,
    stock: 5,
    leadTimeDays: 15,
  },
  {
    code: "VLM-400-022",
    description: "Pattino di spinta in POM",
    keywords: ["pattino di spinta", "pattino pom", "spinta cartone"],
    listPrice: 102.4,
    stock: 3,
    leadTimeDays: 20,
  },
  {
    code: "VLM-400-030",
    description: "Sensore di finecorsa induttivo M12",
    keywords: [
      "sensore finecorsa",
      "finecorsa induttivo",
      "proximity m12",
      "finecorsa spinta",
    ],
    listPrice: 41.85,
    stock: 12,
    leadTimeDays: 8,
  },
  {
    code: "VLM-500-001",
    description: "Testata nastrante superiore 50 mm",
    keywords: [
      "testata nastrante",
      "testata superiore",
      "nastratrice",
      "testata nastro",
    ],
    listPrice: 516.2,
    stock: 1,
    leadTimeDays: 20,
  },
  {
    code: "VLM-500-011",
    description: "Lama di taglio nastro",
    keywords: ["lama di taglio", "lama nastro", "coltello nastro", "lama siat"],
    listPrice: 24.65,
    stock: 26,
    leadTimeDays: 10,
  },
  {
    code: "VLM-600-002",
    description: "Tappeto PVC 2 mm verde",
    keywords: ["tappeto pvc", "tappeto uscita", "nastro uscita", "pvc verde"],
    listPrice: 40.6,
    stock: 11,
    leadTimeDays: 10,
  },
  {
    code: "VLM-KIT-2000H",
    description: "Kit manutenzione 2.000 ore VLM 2200",
    keywords: [
      "kit manutenzione",
      "kit 2000",
      "manutenzione 2000 ore",
      "kit usura",
    ],
    listPrice: 278.8,
    stock: 4,
    leadTimeDays: 10,
  },
  {
    code: "VLM-KIT-8000H",
    description: "Kit manutenzione 8.000 ore VLM 2200",
    keywords: ["kit 8000", "manutenzione 8000 ore", "kit grande manutenzione"],
    listPrice: 846.6,
    stock: 1,
    leadTimeDays: 20,
  },
];

function vlm2200(
  serial: string,
  year: number,
  extras: BomComponent[] = []
): Machine {
  return {
    serial,
    model: "Incartonatrice VLM-2200",
    year,
    category: "Incartonatrici automatiche",
    bom: [...VLM_2200_BOM, ...extras],
  };
}

/** Macchine del parco Vallmec usate nelle email demo Spark. */
export const MACHINES: Machine[] = [
  vlm2200("1389", 2021), // Salumificio Ponte Nuovo
  vlm2200("1418", 2022), // Dolciaria Fontanini
  vlm2200("1412", 2022), // Nutrilab Integratori
  vlm2200("1475", 2025), // Molino Serravalle
  vlm2200("1364", 2019), // Caseificio Val Trebbia
  vlm2200("1432", 2023), // Farmaceutici Lorentin
  vlm2200("1301", 2016), // Caseificio Val Trebbia (vecchia)
  vlm2200("1441", 2023), // Caffè Torrefazione Sud
];

/** Testo iniziale della pagina "Crea offerta" (vuoto). */
export const SAMPLE_REQUEST = "";

/** Dati azienda per la carta intestata del preventivo. */
export const COMPANY = {
  name: "Vallmec S.p.A.",
  tagline: "Incartonatrici automatiche & ricambi after-sales",
  address: "Via dell'Industria, Castel San Giovanni (PC)",
  vat: "P.IVA IT01234567890",
  email: "service@vallmec.demo",
  phone: "+39 0523 000 000",
};
