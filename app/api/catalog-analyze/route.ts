import { NextResponse } from "next/server";
import {
  buildCatalogSummary,
  buildImpact,
  findSubstitutionsMock,
  proposePrice,
  runDeterministicAnalysis,
} from "@/lib/catalogAnalysis";
import {
  CATALOG_SOURCES,
  DEMO_CATALOG_ARTICLES,
} from "@/lib/catalogAnalysisData";
import type {
  CatalogFinding,
  PartCategory,
} from "@/lib/catalogAnalysisTypes";
import { CATEGORY_LABELS } from "@/lib/catalogAnalysisTypes";
import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";

// =============================================================
// POST /api/catalog-analyze
// -------------------------------------------------------------
// Analisi di pulizia catalogo ricambi (demo Vallmec).
// Deterministico: duplicati, obsoleti, gap ERP, prezzi, descrizioni.
// Fuzzy (Anthropic se chiave presente): sostituzioni, categoria
// per articoli senza categoria. Fallback mock altrimenti.
//
// In produzione: input = PDF/export gestionale reali del cliente.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as PartCategory[];

type FuzzyPayload = {
  substitutions?: {
    oldCode: string;
    newCode: string;
    confidence: number;
    reason: string;
  }[];
  categories?: { code: string; category: PartCategory; confidence: number }[];
};

function parseFuzzyJson(text: string): FuzzyPayload | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1)) as FuzzyPayload;
  } catch {
    return null;
  }
}

async function enrichWithAnthropic(
  findings: CatalogFinding[]
): Promise<{ findings: CatalogFinding[]; source: "anthropic" | "mock" }> {
  const key = getAnthropicKey();
  if (!key) {
    return { findings, source: "mock" };
  }

  const uncategorized = DEMO_CATALOG_ARTICLES.filter((a) => a.category == null);
  const codeIndex = new Map(
    DEMO_CATALOG_ARTICLES.map((a) => [
      a.code,
      { code: a.code, description: a.description, obsolete: Boolean(a.obsoleteFlag) },
    ])
  );
  const uniqueCodes = [...codeIndex.values()];

  const prompt = `Sei l'agente di pulizia catalogo ricambi di aestima (macchine packaging / Vallmec).
Analizza questi articoli e proponi SOLO:
1) possibili sostituzioni vecchio→nuovo (stesso pezzo in versioni diverse / fuori produzione)
2) categoria per articoli senza categoria

Categorie ammesse: ${CATEGORIES.join(", ")}.

Articoli:
${JSON.stringify(uniqueCodes, null, 0)}

Senza categoria:
${JSON.stringify(
  uncategorized.map((a) => ({ code: a.code, description: a.description })),
  null,
  0
)}

Rispondi SOLO con JSON:
{
  "substitutions": [{"oldCode":"...","newCode":"...","confidence":0.0,"reason":"..."}],
  "categories": [{"code":"...","category":"...","confidence":0.0}]
}`;

  const result = await callAnthropicMessages({
    system:
      "Rispondi esclusivamente con JSON valido, senza markdown. L'agente propone, l'esperto conferma.",
    user: prompt,
    maxTokens: 1200,
  });

  if (!result.ok) {
    return { findings, source: "mock" };
  }

  const fuzzy = parseFuzzyJson(result.text);
  if (!fuzzy) {
    return { findings, source: "mock" };
  }

  let next = findings.filter((f) => f.kind !== "substitution");
  const byCode = new Map<string, (typeof DEMO_CATALOG_ARTICLES)[0]>();
  for (const a of DEMO_CATALOG_ARTICLES) {
    if (!byCode.has(a.code)) byCode.set(a.code, a);
  }

  const subs =
    fuzzy.substitutions && fuzzy.substitutions.length > 0
      ? fuzzy.substitutions
      : null;

  if (subs) {
    for (const sub of subs) {
      const oldA = byCode.get(sub.oldCode);
      const newA = byCode.get(sub.newCode);
      if (!oldA || !newA) continue;
      const conf = Math.min(1, Math.max(0.5, Number(sub.confidence) || 0.75));
      next.push({
        id: `sub-${sub.oldCode}-${sub.newCode}`,
        kind: "substitution",
        confidence: conf,
        title: `${sub.oldCode} → ${sub.newCode}`,
        summary: sub.reason || "Possibile sostituzione / succedaneo.",
        proposedAction: `Mappare ${sub.oldCode} → ${sub.newCode} come succedaneo.`,
        articleIds: [oldA.id, newA.id],
        codes: [sub.oldCode, sub.newCode],
        detail: {
          old: { code: sub.oldCode, description: oldA.description },
          new: { code: sub.newCode, description: newA.description },
        },
        source: "anthropic",
      });
    }
  } else {
    next = [...next, ...findSubstitutionsMock(DEMO_CATALOG_ARTICLES)];
  }

  if (fuzzy.categories?.length) {
    next = next.map((f) => {
      if (f.kind !== "missing_price" || !f.detail?.categoryMissing) return f;
      const code = f.codes[0];
      const cat = fuzzy.categories!.find((c) => c.code === code);
      if (!cat || !CATEGORIES.includes(cat.category)) return f;
      const article = byCode.get(code);
      if (!article?.purchasePrice) return f;
      const proposal = proposePrice(article.purchasePrice, cat.category);
      return {
        ...f,
        confidence: Math.max(f.confidence, Number(cat.confidence) || 0.8),
        summary: `Categoria proposta: ${CATEGORY_LABELS[cat.category]}. Prezzo da acquisto × moltiplicatore.`,
        priceProposal: proposal,
        detail: { ...f.detail, categoryMissing: false, categorySource: "anthropic" },
        source: "anthropic",
      };
    });
  }

  return { findings: next, source: "anthropic" };
}

export async function POST() {
  // In produzione: riceverebbe file/export del cliente.
  const articles = DEMO_CATALOG_ARTICLES;
  const summary = buildCatalogSummary(articles);
  let findings = runDeterministicAnalysis(articles);

  const enriched = await enrichWithAnthropic(findings);
  findings = enriched.findings;

  const impact = buildImpact(findings);

  return NextResponse.json({
    summary,
    findings,
    impact,
    source: enriched.source,
    sources: CATALOG_SOURCES,
    articles,
  });
}
