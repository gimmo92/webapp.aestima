import { prisma } from "@/lib/prisma";
import { DEMO_COMPANY_SLUG } from "@/lib/workspace/seed";
import { exampleLeadTimeDays } from "./exampleLeadTime";
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
  rankCatalog: (query: string) => Promise<SparePartProposal[]>;
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
  leadTimeGiorni: number | null;
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
    "teeth",
    "tooth",
    "denti",
    "cog",
    "chainwheel",
    "idler",
    "tenditore",
    "timing",
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

function normalizePartCode(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Codici tipo 14067P-001 / F0046-00093 scritti dall'utente. */
function extractPartCodes(query: string): string[] {
  const raw = query.match(/[A-Za-z0-9]+(?:[-./][A-Za-z0-9]+)*/g) ?? [];
  return [
    ...new Set(
      raw
        .map((c) => c.trim())
        .filter((c) => c.length >= 4 && /\d/.test(c))
    ),
  ];
}

function isExactPartCode(candidate: string, query: string): boolean {
  const needle = normalizePartCode(candidate);
  if (needle.length < 4) return false;
  return extractPartCodes(query).some(
    (c) => normalizePartCode(c) === needle
  );
}

function rowHasExactCode(row: SpareRow, query: string): boolean {
  return (
    isExactPartCode(row.codice, query) ||
    Boolean(row.codiceOEM && isExactPartCode(row.codiceOEM, query))
  );
}

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
  requiredGroup: string[] | null,
  query: string
): number {
  if (rowHasExactCode(row, query)) return 100;

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
  if (score >= 100) return 100;
  const abs = Math.min(88, 18 + score * 5);
  const rel = topScore > 0 ? (score / topScore) * 12 : 0;
  return Math.max(22, Math.min(96, Math.round(abs + rel - rank * 4)));
}

function hitsToProposals(
  scored: Array<{ r: SpareRow; s: number }>,
  query: string
): SparePartProposal[] {
  const topScore = scored[0]?.s ?? 0;
  return scored.slice(0, 12).map(({ r, s }, i) => ({
    code: r.codice,
    description: (r.descrizione || r.nome || r.codice).slice(0, 180),
    price: r.prezzoListino ?? 0,
    availability: r.disponibile === false ? "da_ordinare" : "disponibile",
    leadTimeDays:
      r.leadTimeGiorni && r.leadTimeGiorni > 0
        ? r.leadTimeGiorni
        : exampleLeadTimeDays(r),
    confidence: rowHasExactCode(r, query)
      ? 100
      : scoreToConfidence(s, i, topScore),
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

function betterPrice(a?: number, b?: number): number {
  const av = typeof a === "number" && Number.isFinite(a) ? a : 0;
  const bv = typeof b === "number" && Number.isFinite(b) ? b : 0;
  return av > 0 ? av : bv;
}

function mergePartFields(
  catalog: SparePartProposal | undefined,
  overlay: SparePartProposal
): SparePartProposal {
  if (!catalog) return overlay;
  return {
    ...catalog,
    ...overlay,
    price: betterPrice(overlay.price, catalog.price),
    availability: catalog.availability,
    confidence:
      Math.max(overlay.confidence ?? 0, catalog.confidence ?? 0) ||
      overlay.confidence ||
      catalog.confidence,
    oemCode: overlay.oemCode || catalog.oemCode,
    name: overlay.name || catalog.name,
    brand: overlay.brand || catalog.brand,
    manufacturer: overlay.manufacturer || catalog.manufacturer,
    supplier: overlay.supplier || catalog.supplier,
    category: overlay.category || catalog.category,
    unit: overlay.unit || catalog.unit,
    compatibleMachine: overlay.compatibleMachine || catalog.compatibleMachine,
    leadTimeDays:
      overlay.leadTimeDays && overlay.leadTimeDays > 0
        ? overlay.leadTimeDays
        : catalog.leadTimeDays,
    description:
      overlay.description?.trim() || catalog.description,
  };
}

export function mergeSparePartConfidence(
  parts: SparePartProposal[],
  catalogHits: SparePartProposal[]
): SparePartProposal[] {
  const byCode = new Map<string, SparePartProposal>();
  for (const h of catalogHits) {
    byCode.set(h.code.toLowerCase(), h);
    byCode.set(normalizePartCode(h.code), h);
  }
  return parts.map((p) => {
    const hit =
      byCode.get(p.code.toLowerCase()) ??
      byCode.get(normalizePartCode(p.code));
    return mergePartFields(hit, p);
  });
}

export function rankCatalogHits(
  rows: SpareRow[],
  query: string
): SparePartProposal[] {
  const tokens = expandTokens(tokenize(query));
  const required = requiredTypeGroup(tokens);
  const scored = rows
    .map((r) => ({ r, s: scoreRow(r, tokens, required, query) }))
    .filter((x) => x.s >= MIN_HIT_SCORE || rowHasExactCode(x.r, query))
    .sort((a, b) => b.s - a.s)
    .slice(0, 12);
  return hitsToProposals(scored, query);
}

export function applyExactCodeConfidence(
  parts: SparePartProposal[],
  query: string
): SparePartProposal[] {
  if (!query.trim()) return parts;
  return parts.map((p) =>
    isExactPartCode(p.code, query) ||
    (p.oemCode ? isExactPartCode(p.oemCode, query) : false)
      ? { ...p, confidence: 100 }
      : p
  );
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
  return parts.filter(
    (p) =>
      isExactPartCode(p.code, query) ||
      (p.oemCode ? isExactPartCode(p.oemCode, query) : false) ||
      required.some((t) => partHaystack(p).includes(t))
  );
}

export function mergeProposedParts(
  fromLlm: SparePartProposal[] | undefined,
  fromCatalog: SparePartProposal[],
  limit = 8
): SparePartProposal[] | undefined {
  const map = new Map<string, SparePartProposal>();
  for (const p of [...fromCatalog, ...(fromLlm ?? [])]) {
    const key = normalizePartCode(p.code) || p.code.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, p);
      continue;
    }
    map.set(key, mergePartFields(prev, p));
  }
  const all = [...map.values()].sort(
    (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
  );
  return all.length > 0 ? all.slice(0, limit) : undefined;
}

const CATALOG_SELECT = {
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
  leadTimeGiorni: true,
} as const;

function mergeRows(base: SpareRow[], extra: SpareRow[]): SpareRow[] {
  const map = new Map(base.map((r) => [r.codice.toLowerCase(), r]));
  for (const r of extra) map.set(r.codice.toLowerCase(), r);
  return [...map.values()];
}

async function fetchRowsByExactCodes(
  companyId: string,
  query: string
): Promise<SpareRow[]> {
  const codes = extractPartCodes(query);
  if (codes.length === 0) return [];
  return prisma.sparePart.findMany({
    where: {
      companyId,
      OR: codes.flatMap((code) => [
        { codice: { equals: code, mode: "insensitive" } },
        { codiceOEM: { equals: code, mode: "insensitive" } },
        { codice: { contains: code, mode: "insensitive" } },
        { codiceOEM: { contains: code, mode: "insensitive" } },
      ]),
    },
    select: CATALOG_SELECT,
    take: 20,
  });
}

async function fetchRowsByType(
  companyId: string,
  query: string
): Promise<SpareRow[]> {
  const group = requiredTypeGroup(expandTokens(tokenize(query)));
  if (!group) return [];
  const terms = group.filter((t) => t.length >= 4).slice(0, 10);
  if (terms.length === 0) return [];
  return prisma.sparePart.findMany({
    where: {
      companyId,
      OR: terms.flatMap((term) => [
        { descrizione: { contains: term, mode: "insensitive" } },
        { nome: { contains: term, mode: "insensitive" } },
      ]),
    },
    select: CATALOG_SELECT,
    take: 500,
    orderBy: { codice: "asc" },
  });
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
    select: CATALOG_SELECT,
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
              `- ${h.code}: ${h.description}${h.leadTimeDays ? ` | LT ${h.leadTimeDays} gg` : ""}${h.confidence != null ? ` | confidenza ${h.confidence}%` : ""}`
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
    rankCatalog: async (query) => {
      const extra = await Promise.all([
        fetchRowsByType(companyId, query),
        fetchRowsByExactCodes(companyId, query),
      ]);
      return rankCatalogHits(mergeRows(rows, extra.flat()), query);
    },
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
    rankCatalog: async () => [],
  };
}

export function serializeChatPark(
  machines: ChatMachine[]
): Array<{ model: string; serial: string }> {
  return machines.map((m) => ({ model: m.model, serial: m.serial }));
}
