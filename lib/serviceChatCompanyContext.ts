import { prisma } from "@/lib/prisma";
import { DEMO_COMPANY_SLUG } from "@/lib/workspace/seed";
import { SERVICE_MACHINES, type ChatMachine } from "./serviceChatData";
import type { SparePartProposal } from "./serviceChatTypes";

export type ServiceChatCompanyContext = {
  companyName: string;
  companySlug: string;
  isDemo: boolean;
  machines: ChatMachine[];
  catalogCount: number;
  catalogBlock: string;
  catalogHits: SparePartProposal[];
  /** Ri-esegue il ranking sul catalogo (es. dopo la descrizione visiva del modello). */
  rankCatalog: (query: string) => SparePartProposal[];
};

type SpareRow = {
  codice: string;
  codiceOEM: string | null;
  nome: string | null;
  descrizione: string;
  categoria: string | null;
  brand: string | null;
  produttore: string | null;
  prezzoListino: number | null;
  macchinaCompatibile: string | null;
  disponibile: boolean | null;
  fornitore: string | null;
};

export function machinesFromCompatibleLabels(
  labels: Array<string | null | undefined>
): ChatMachine[] {
  const seen = new Set<string>();
  const out: ChatMachine[] = [];
  for (const raw of labels) {
    const label = raw?.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `cat-${out.length + 1}`,
      model: label,
      serial: label,
      year: 0,
      category: "catalogo",
      variant: "",
      parts: [],
    });
    if (out.length >= 40) break;
  }
  return out;
}

const STOPWORDS = new Set([
  "foto",
  "immagine",
  "immagini",
  "allegato",
  "allegati",
  "file",
  "ricambio",
  "ricambi",
  "componente",
  "componenti",
  "pezzo",
  "pezzi",
  "part",
  "parts",
  "the",
  "and",
  "with",
  "for",
  "from",
  "this",
  "that",
  "what",
  "appears",
  "typically",
  "used",
  "into",
  "have",
  "has",
  "was",
  "were",
  "una",
  "uno",
  "del",
  "della",
  "delle",
  "dei",
  "nel",
  "nella",
  "con",
  "per",
  "che",
  "non",
  "sono",
  "come",
  "questo",
  "questa",
  "cerca",
  "cercato",
  "catalogo",
  "match",
  "exact",
  "unable",
  "find",
  "searched",
  "unfortunately",
  "aftercore",
  "assistant",
  "dematic",
  "radwell",
  "please",
  "thanks",
  "mostra",
  "sembra",
  "tipicamente",
  "sistemi",
  "conveyor",
  "sortation",
  "integrated",
  "assemblies",
]);

const TYPE_GROUPS = [
  [
    "gear",
    "gears",
    "sprocket",
    "sprockets",
    "pignone",
    "ingranaggio",
    "ingranaggi",
    "ruota",
    "ruote",
    "dentata",
    "dentato",
    "dentate",
    "toothed",
    "cog",
    "chainwheel",
  ],
  ["bearing", "bearings", "cuscinetto", "cuscinetti", "ucf"],
  ["belt", "cinghia", "cinghie"],
  ["sensor", "sensore", "encoder", "fotocellula"],
  ["motor", "motore", "drive"],
  ["chain", "catena"],
  ["pulley", "puleggia"],
  ["valve", "valvola", "valvole"],
  ["regulator", "regolatore", "pneumatic", "pneumatico", "pneumatica"],
  ["filter", "filtro"],
  ["board", "scheda", "pcb", "circuit"],
  ["roller", "rullo"],
  ["slat", "doghe", "doga"],
];

const MIN_HIT_SCORE = 3;

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function expandTokens(tokens: string[]): string[] {
  const extra: string[] = [];
  for (const group of TYPE_GROUPS) {
    if (tokens.some((t) => group.includes(t))) extra.push(...group);
  }
  return [...new Set([...tokens, ...extra])];
}

function requiredTypeGroup(tokens: string[]): string[] | null {
  for (const group of TYPE_GROUPS) {
    if (tokens.some((t) => group.includes(t))) return group;
  }
  return null;
}

function rowHaystack(row: SpareRow): string {
  return [
    row.codice,
    row.codiceOEM,
    row.nome,
    row.descrizione,
    row.brand,
    row.produttore,
    row.macchinaCompatibile,
    row.categoria,
    row.fornitore,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function scoreRow(
  row: SpareRow,
  tokens: string[],
  requiredGroup: string[] | null
): number {
  const hay = rowHaystack(row);
  if (requiredGroup && !requiredGroup.some((t) => hay.includes(t))) return 0;

  let score = 0;
  let matches = 0;
  for (const t of tokens) {
    if (row.codice.toLowerCase() === t) {
      score += 14;
      matches += 1;
    } else if (row.codice.toLowerCase().includes(t)) {
      score += 7;
      matches += 1;
    } else if ((row.codiceOEM ?? "").toLowerCase().includes(t)) {
      score += 6;
      matches += 1;
    } else if (hay.includes(t)) {
      score += t.length > 4 ? 3 : 1;
      matches += 1;
    }
  }
  const minMatches = requiredGroup ? 1 : 2;
  if (score < 14 && matches < minMatches) return 0;
  return score;
}

function scoreToConfidence(score: number, rank: number, topScore: number): number {
  if (score <= 0) return 0;
  const abs = Math.min(88, 18 + score * 5);
  const rel = topScore > 0 ? (score / topScore) * 12 : 0;
  return Math.max(22, Math.min(96, Math.round(abs + rel - rank * 4)));
}

function hitsToProposals(
  scored: Array<{ r: SpareRow; s: number }>
): SparePartProposal[] {
  const topScore = scored[0]?.s ?? 0;
  return scored.slice(0, 6).map(({ r, s }, i) => ({
    code: r.codice,
    description: (r.descrizione || r.nome || r.codice).slice(0, 180),
    price: r.prezzoListino ?? 0,
    availability: r.disponibile === false ? "da_ordinare" : "disponibile",
    confidence: scoreToConfidence(s, i, topScore),
    oemCode: r.codiceOEM ?? undefined,
    name: r.nome ?? undefined,
    brand: r.brand ?? undefined,
    manufacturer: r.produttore ?? undefined,
    supplier: r.fornitore ?? undefined,
    category: r.categoria ?? undefined,
    compatibleMachine: r.macchinaCompatibile ?? undefined,
  }));
}

export function clampConfidence(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(/%/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return undefined;
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

export function mergeSparePartConfidence(
  parts: SparePartProposal[],
  catalogHits: SparePartProposal[]
): SparePartProposal[] {
  const byCode = new Map(
    catalogHits.map((h) => [h.code.toLowerCase(), h])
  );
  return parts.map((p) => {
    const hit = byCode.get(p.code.toLowerCase());
    return {
      ...hit,
      ...p,
      confidence: clampConfidence(p.confidence) ?? hit?.confidence,
    };
  });
}

export function rankCatalogHits(
  rows: SpareRow[],
  query: string
): SparePartProposal[] {
  const tokens = expandTokens(tokenize(query));
  if (tokens.length === 0) return [];
  const required = requiredTypeGroup(tokens);
  const scored = rows
    .map((r) => ({ r, s: scoreRow(r, tokens, required) }))
    .filter((x) => x.s >= MIN_HIT_SCORE)
    .sort((a, b) => b.s - a.s)
    .slice(0, 12);
  return hitsToProposals(scored);
}

function partHaystack(part: SparePartProposal): string {
  return [
    part.code,
    part.description,
    part.name,
    part.category,
    part.oemCode,
    part.brand,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Tiene solo i ricambi compatibili con il tipo riconosciuto (es. ruota dentata). */
export function filterPartsByVisualQuery(
  parts: SparePartProposal[],
  query: string
): SparePartProposal[] {
  const tokens = expandTokens(tokenize(query));
  const required = requiredTypeGroup(tokens);
  if (!required) return parts;
  return parts.filter((p) => required.some((t) => partHaystack(p).includes(t)));
}

function sampleCodes(rows: SpareRow[]): string {
  const codes = rows.map((r) => r.codice).filter(Boolean);
  if (codes.length === 0) return "n/d";
  if (codes.length <= 300) return codes.join(", ");
  const step = Math.ceil(codes.length / 300);
  return codes.filter((_, i) => i % step === 0).slice(0, 300).join(", ");
}

export async function loadServiceChatCompanyContext(
  companyId: string,
  companyName: string,
  companySlug: string,
  userQuery: string
): Promise<ServiceChatCompanyContext> {
  const isDemo = companySlug === DEMO_COMPANY_SLUG;
  const rows = await prisma.sparePart.findMany({
    where: { companyId },
    select: {
      codice: true,
      codiceOEM: true,
      nome: true,
      descrizione: true,
      categoria: true,
      brand: true,
      produttore: true,
      prezzoListino: true,
      macchinaCompatibile: true,
      disponibile: true,
      fornitore: true,
    },
    take: 2500,
    orderBy: { codice: "asc" },
  });

  // Le etichette "macchina compatibile" del listino NON sono un parco impianti.
  // Solo la company demo (Spark) ha anagrafica macchine Valmec.
  const machines: ChatMachine[] = isDemo ? SERVICE_MACHINES : [];

  const catalogHits = rankCatalogHits(rows, userQuery);

  const brands = [
    ...new Set(
      rows
        .map((r) => r.brand || r.produttore || r.fornitore)
        .filter((b): b is string => Boolean(b?.trim()))
    ),
  ].slice(0, 16);

  const machineLines =
    machines.length > 0
      ? machines
          .map((m) => `- ${m.model}${m.serial && m.serial !== m.model ? ` · matricola ${m.serial}` : ""}`)
          .join("\n")
      : "(Nessuna anagrafica macchine in questa company. NON inventare matricole di altre aziende.)";

  const catalogBlock = `=== COMPANY ATTIVA ===
Nome: ${companyName}
Slug: ${companySlug}

=== CATALOGO RICAMBI CARICATO (${rows.length} articoli) ===
Brand/fornitori: ${brands.join(", ") || "n/d"}
Usa SOLO questi articoli per proposte ricambi. Non usare listini Vallmec/VLM se non compaiono qui.

${
    catalogHits.length > 0
      ? `Voci più pertinenti alla richiesta (ranking testuale, da verificare sulla foto):\n${catalogHits
          .map(
            (h) =>
              `- ${h.code}: ${h.description}${h.confidence != null ? ` | confidenza ${h.confidence}%` : ""}`
          )
          .join("\n")}`
      : "(Nessun match testuale forte. Identifica il tipo di pezzo dalla foto e proponi SOLO voci dello stesso tipo. Se non ci sono, spareParts=null.)"
  }

Campione codici in catalogo: ${sampleCodes(rows)}

=== PARCO MACCHINE ===
${
    isDemo
      ? machineLines
      : "Questa company NON gestisce un parco macchine. Non chiedere matricola/modello. Non elencare impianti. Cerca solo nel catalogo ricambi (foto, codice, descrizione)."
  }

REGOLE ANTI-CONTAMINAZIONE
- Vietato citare Vallmec, Valmec, VLM-2200, VLM-1800 o matricole 1389/1418/1412/1432.
- Se non c'è parco macchine: identifica il pezzo da foto/testo e proponi subito match del catalogo. quickReplies senza matricole.
- I ricambi stanno nel catalogo caricato (es. Radwell), non nella distinta demo.
- spareParts SOLO se il tipo del pezzo coincide con la foto (es. ruota dentata ≠ regolatore pneumatico). Se non c'è match credibile: spareParts=null.`;

  return {
    companyName,
    companySlug,
    isDemo,
    machines,
    catalogCount: rows.length,
    catalogBlock,
    catalogHits,
    rankCatalog: (query) => rankCatalogHits(rows, query),
  };
}

export function anonymousServiceChatContext(): ServiceChatCompanyContext {
  return {
    companyName: "",
    companySlug: "",
    isDemo: false,
    machines: [],
    catalogCount: 0,
    catalogBlock: `=== COMPANY ATTIVA ===
Nessuna sessione company.
NON usare parco Vallmec/VLM-2200 né matricole 1389/1418/1412/1432.`,
    catalogHits: [],
    rankCatalog: () => [],
  };
}

export function serializeChatPark(
  machines: ChatMachine[]
): Array<{ model: string; serial: string }> {
  return machines.map((m) => ({ model: m.model, serial: m.serial }));
}
