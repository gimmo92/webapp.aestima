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

function formatHits(rows: SpareRow[]): string {
  return rows
    .map((r) => {
      const price =
        r.prezzoListino != null ? ` | €${r.prezzoListino}` : "";
      const oem = r.codiceOEM ? ` | OEM ${r.codiceOEM}` : "";
      const brand = r.brand || r.produttore || r.fornitore;
      const brandBit = brand ? ` | ${brand}` : "";
      const machine = r.macchinaCompatibile
        ? ` | macchina ${r.macchinaCompatibile}`
        : "";
      const desc = (r.descrizione || r.nome || "").slice(0, 140);
      return `- ${r.codice}${oem}: ${desc}${brandBit}${price}${machine}`;
    })
    .join("\n");
}

function hitsToProposals(rows: SpareRow[]): SparePartProposal[] {
  return rows.slice(0, 6).map((r) => ({
    code: r.codice,
    description: (r.descrizione || r.nome || r.codice).slice(0, 180),
    price: r.prezzoListino ?? 0,
    availability: r.disponibile === false ? "da_ordinare" : "disponibile",
  }));
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
  let hits = rows
    .map((r) => ({ r, s: scoreRow(r, tokens) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, 40)
    .map((x) => x.r);
  if (hits.length === 0 && rows.length > 0) {
    hits = rows.slice(0, 25);
  }

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

${hits.length > 0 ? `Voci più pertinenti alla richiesta:\n${formatHits(hits)}` : "(Nessun match forte sulla query: usa l'elenco codici e la foto/descrizione.)"}

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
    catalogHits: hitsToProposals(hits),
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
