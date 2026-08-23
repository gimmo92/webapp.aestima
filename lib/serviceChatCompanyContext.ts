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

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function scoreRow(row: SpareRow, tokens: string[]): number {
  const hay = [
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
  let score = 0;
  for (const t of tokens) {
    if (row.codice.toLowerCase() === t) score += 14;
    else if (row.codice.toLowerCase().includes(t)) score += 7;
    else if ((row.codiceOEM ?? "").toLowerCase().includes(t)) score += 6;
    else if (hay.includes(t)) score += t.length > 4 ? 3 : 1;
  }
  return score;
}

function formatHits(scored: Array<{ r: SpareRow; s: number }>): string {
  const topScore = scored[0]?.s ?? 0;
  return scored
    .slice(0, 40)
    .map(({ r, s }, i) => {
      const price =
        r.prezzoListino != null ? ` | €${r.prezzoListino}` : "";
      const oem = r.codiceOEM ? ` | OEM ${r.codiceOEM}` : "";
      const brand = r.brand || r.produttore || r.fornitore;
      const brandBit = brand ? ` | ${brand}` : "";
      const machine = r.macchinaCompatibile
        ? ` | macchina ${r.macchinaCompatibile}`
        : "";
      const desc = (r.descrizione || r.nome || "").slice(0, 140);
      const conf = scoreToConfidence(s, i, topScore);
      return `- ${r.codice}${oem}: ${desc}${brandBit}${price}${machine} | confidenza ${conf}%`;
    })
    .join("\n");
}

function scoreToConfidence(score: number, rank: number, topScore: number): number {
  if (score <= 0) return Math.max(28, 45 - rank * 4);
  const rel = topScore > 0 ? score / topScore : 0;
  return Math.max(32, Math.min(97, Math.round(rel * 88 + 8 - rank * 5)));
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
  return parts.map((p, i) => {
    const hit = byCode.get(p.code.toLowerCase());
    return {
      ...hit,
      ...p,
      confidence:
        clampConfidence(p.confidence) ??
        hit?.confidence ??
        Math.max(30, 78 - i * 10),
    };
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

  const photoHints =
    /foto|immagine|allegat|ricambio|pezzo|supporto|flang|cuscinett|bearing|ucf|regolat|pressure|pneumatic|increase/i.test(
      userQuery
    )
      ? [
          "supporto",
          "flangiato",
          "cuscinetto",
          "bearing",
          "ucf",
          "housing",
          "flange",
          "regolatore",
          "pressione",
          "pneumatic",
          "regulator",
          "valvola",
        ]
      : [];
  const tokens = tokenize(`${userQuery} ${photoHints.join(" ")}`);
  const scored = rows
    .map((r) => ({ r, s: scoreRow(r, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 40);
  const scoredHits =
    scored.length > 0
      ? scored
      : rows.slice(0, 25).map((r, i) => ({ r, s: Math.max(1, 6 - i) }));
  const hits = scoredHits.map((x) => x.r);

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

${hits.length > 0 ? `Voci più pertinenti alla richiesta:\n${formatHits(scoredHits)}` : "(Nessun match forte sulla query: usa l'elenco codici e la foto/descrizione.)"}

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
- I ricambi stanno nel catalogo caricato (es. Radwell), non nella distinta demo.`;

  return {
    companyName,
    companySlug,
    isDemo,
    machines,
    catalogCount: rows.length,
    catalogBlock,
    catalogHits: hitsToProposals(scoredHits),
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
  };
}

export function serializeChatPark(
  machines: ChatMachine[]
): Array<{ model: string; serial: string }> {
  return machines.map((m) => ({ model: m.model, serial: m.serial }));
}
