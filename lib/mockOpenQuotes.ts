export type MockOpenQuote = {
  id: string;
  number: string;
  company: string;
  contact: string;
  title: string;
  status: "bozza" | "inviata";
};

/** Offerte demo ancora lavorabili (non storico chiuso). */
export const MOCK_OPEN_QUOTES: MockOpenQuote[] = [
  {
    id: "q-005",
    number: "PREV-2026-0005",
    company: "Farmaceutici Lorentin S.p.A.",
    contact: "Andrea Conti",
    title: "Sensore finecorsa slitta — matr. 1432",
    status: "bozza",
  },
  {
    id: "q-002",
    number: "PREV-2026-0002",
    company: "Nutrilab Integratori S.r.l.",
    contact: "Laura Bianchi",
    title: "Fotocellula ingresso — VLM 2200 1412",
    status: "bozza",
  },
  {
    id: "q-017",
    number: "PREV-2026-0017",
    company: "Caseificio Val Trebbia S.p.A.",
    contact: "Paolo Martini",
    title: "Cuscinetto nastro alimentazione — matr. 1301",
    status: "bozza",
  },
  {
    id: "q-001",
    number: "PREV-2026-0001",
    company: "Salumificio Ponte Nuovo S.p.A.",
    contact: "Marco Rossi",
    title: "Cinghia gruppo spinta — matr. 1389",
    status: "bozza",
  },
  {
    id: "q-009",
    number: "PREV-2026-0009",
    company: "Dolciaria Fontanini S.r.l.",
    contact: "Elena Fontanini",
    title: "Ventose formazione — matr. 1418",
    status: "bozza",
  },
];

const KEY = "aftercore:mock-open-quotes";

type LinesByQuote = Record<string, string[]>;

function canUseStorage() {
  return typeof window !== "undefined";
}

function readMap(): LinesByQuote {
  if (!canUseStorage()) return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: LinesByQuote = {};
    for (const [id, codes] of Object.entries(parsed)) {
      if (Array.isArray(codes)) {
        out[id] = codes.filter((c): c is string => typeof c === "string");
      }
    }
    return out;
  } catch {
    return {};
  }
}

function writeMap(map: LinesByQuote) {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function quoteHasPart(quoteId: string, code: string): boolean {
  const needle = code.trim().toUpperCase();
  return (readMap()[quoteId] ?? []).some((c) => c.toUpperCase() === needle);
}

/** Aggiunge il codice all'offerta fittizia (niente duplicati). */
export function addPartToMockQuote(quoteId: string, code: string): boolean {
  const needle = code.trim().toUpperCase();
  if (!needle) return false;
  const map = readMap();
  const current = map[quoteId] ?? [];
  if (current.some((c) => c.toUpperCase() === needle)) return false;
  map[quoteId] = [...current, needle];
  writeMap(map);
  return true;
}
