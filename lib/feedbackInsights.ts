// =============================================================
// Analisi dei feedback raccolti sui rapporti d'intervento:
// sentiment aggregato e temi più ricorrenti nelle richieste.
// Calcolo locale e deterministico, nessuna chiamata esterna.
// =============================================================

import {
  analyzeSentiment,
  type CustomerSentiment,
} from "./interventionReportDraft";
import type { InterventionReportRecord } from "./reportsStore";

export interface FeedbackTheme {
  id: string;
  label: string;
  /** Cosa il cliente sta chiedendo, in una riga. */
  hint: string;
  keywords: string[];
}

/** Temi ricorrenti nelle segnalazioni dei clienti after-sales. */
export const FEEDBACK_THEMES: FeedbackTheme[] = [
  {
    id: "ergonomia",
    label: "Ergonomia e comandi",
    hint: "Comandi scomodi, accessi difficili, postura degli operatori",
    keywords: [
      "manopol",
      "comand",
      "pulpito",
      "scomod",
      "ergonom",
      "raggiunger",
      "accesso",
      "pesante da",
      "volantino",
      "maniglia",
      "pannello operatore",
    ],
  },
  {
    id: "costi",
    label: "Costi e listini",
    hint: "Prezzi percepiti alti, richieste di soluzioni più economiche",
    keywords: [
      "economic",
      "costo",
      "costi",
      "costos",
      "caro",
      "prezzo",
      "listino",
      "budget",
      "sconto",
    ],
  },
  {
    id: "ricambi",
    label: "Ricambi e scorte",
    hint: "Disponibilità pezzi, conto deposito, tempi di consegna",
    keywords: [
      "ricambi",
      "ricambio",
      "conto deposito",
      "scorta",
      "scorte",
      "magazzino",
      "disponibil",
      "lead time",
      "consegna",
    ],
  },
  {
    id: "fermi",
    label: "Fermi macchina e affidabilità",
    hint: "Guasti ricorrenti e produzione bloccata",
    keywords: [
      "fermo",
      "fermi",
      "si blocca",
      "bloccat",
      "ripetut",
      "ricorrent",
      "affidabil",
      "allarme",
      "in deroga",
    ],
  },
  {
    id: "tempi",
    label: "Tempi di intervento",
    hint: "Attesa del tecnico e tempi di risposta del service",
    keywords: [
      "tempi di intervento",
      "tempo di risposta",
      "attesa",
      "ritardo",
      "sopralluogo",
      "intervenire prima",
      "troppo tempo",
      "urgenza",
    ],
  },
  {
    id: "formazione",
    label: "Formazione degli operatori",
    hint: "Richieste di corsi, istruzioni e affiancamento",
    keywords: [
      "formazion",
      "corso",
      "addestr",
      "istruzion",
      "training",
      "affiancamento",
      "non sanno",
    ],
  },
  {
    id: "upgrade",
    label: "Upgrade e nuovi modelli",
    hint: "Interesse per versioni diverse, retrofit, sostituzioni",
    keywords: [
      "modello",
      "upgrade",
      "retrofit",
      "ammodernamento",
      "sostituire la macchina",
      "versione nuova",
      "macchina nuova",
    ],
  },
  {
    id: "remoto",
    label: "Telecontrollo e assistenza remota",
    hint: "Monitoraggio a distanza, teleassistenza, comandi remoti",
    keywords: [
      "remot",
      "telecontrollo",
      "teleassistenza",
      "monitoraggio",
      "da distanza",
      "app",
    ],
  },
  {
    id: "contratto",
    label: "Manutenzione programmata",
    hint: "Contratti di service, tagliandi, manutenzione preventiva",
    keywords: [
      "manutenzione programmata",
      "manutenzione preventiva",
      "contratto",
      "tagliando",
      "periodic",
      "check-up",
    ],
  },
  {
    id: "ambiente",
    label: "Rumore, perdite e pulizia",
    hint: "Rumorosità, vibrazioni, perdite di olio, sporco in linea",
    keywords: [
      "rumor",
      "vibrazion",
      "perdit",
      "olio",
      "polvere",
      "sporc",
      "trafila",
    ],
  },
  {
    id: "sicurezza",
    label: "Sicurezza",
    hint: "Ripari, barriere, procedure di messa in sicurezza",
    keywords: [
      "sicurezza",
      "protezion",
      "riparo",
      "barriera",
      "infortun",
      "rischio",
    ],
  },
];

export interface FeedbackEntry {
  report: InterventionReportRecord;
  sentiment: CustomerSentiment;
  feedback: string;
  requests: string[];
  themeIds: string[];
}

export interface ThemeInsight {
  theme: FeedbackTheme;
  count: number;
  positivo: number;
  neutro: number;
  critico: number;
  /** Citazioni dai rapporti, per capire cosa chiedono davvero. */
  quotes: { reportId: string; reportNumber: string; text: string }[];
}

export interface FeedbackInsights {
  entries: FeedbackEntry[];
  totals: {
    reports: number;
    withFeedback: number;
    positivo: number;
    neutro: number;
    critico: number;
    requests: number;
  };
  themes: ThemeInsight[];
  /** Temi non coperti dal catalogo: restano visibili come richieste libere. */
  otherRequests: { reportId: string; reportNumber: string; text: string }[];
}

function matchThemes(text: string): string[] {
  const lower = text.toLowerCase();
  return FEEDBACK_THEMES.filter((theme) =>
    theme.keywords.some((keyword) => lower.includes(keyword))
  ).map((theme) => theme.id);
}

export function buildFeedbackInsights(
  reports: InterventionReportRecord[]
): FeedbackInsights {
  const entries: FeedbackEntry[] = [];

  for (const report of reports) {
    const feedback = report.customerFeedback?.trim() ?? "";
    const requests = (report.customerRequests ?? []).filter((request) =>
      request.trim()
    );
    if (!feedback && requests.length === 0) continue;

    const text = [feedback, ...requests].join(" ");
    entries.push({
      report,
      sentiment:
        report.customerSentiment ?? analyzeSentiment(text) ?? "neutro",
      feedback,
      requests,
      themeIds: matchThemes(text),
    });
  }

  const totals = {
    reports: reports.length,
    withFeedback: entries.length,
    positivo: entries.filter((entry) => entry.sentiment === "positivo").length,
    neutro: entries.filter((entry) => entry.sentiment === "neutro").length,
    critico: entries.filter((entry) => entry.sentiment === "critico").length,
    requests: entries.reduce((sum, entry) => sum + entry.requests.length, 0),
  };

  const themes: ThemeInsight[] = FEEDBACK_THEMES.map((theme) => {
    const matched = entries.filter((entry) => entry.themeIds.includes(theme.id));
    return {
      theme,
      count: matched.length,
      positivo: matched.filter((entry) => entry.sentiment === "positivo").length,
      neutro: matched.filter((entry) => entry.sentiment === "neutro").length,
      critico: matched.filter((entry) => entry.sentiment === "critico").length,
      quotes: matched.map((entry) => ({
        reportId: entry.report.id,
        reportNumber: entry.report.reportNumber,
        text: entry.requests[0] || entry.feedback,
      })),
    };
  })
    .filter((insight) => insight.count > 0)
    // Più segnalazioni prima; a pari merito vince chi ha più clienti critici.
    .sort((a, b) => b.count - a.count || b.critico - a.critico);

  const otherRequests = entries
    .filter((entry) => entry.themeIds.length === 0)
    .map((entry) => ({
      reportId: entry.report.id,
      reportNumber: entry.report.reportNumber,
      text: entry.requests[0] || entry.feedback,
    }));

  return { entries, totals, themes, otherRequests };
}
