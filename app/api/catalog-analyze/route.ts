import { NextResponse } from "next/server";
import {
  buildCatalogSummary,
  buildImpact,
  extractedRowsToCatalogArticles,
  findSubstitutionsMock,
  proposePrice,
  runDeterministicAnalysis,
} from "@/lib/catalogAnalysis";
import {
  CATALOG_SOURCES,
  DEMO_CATALOG_ARTICLES,
} from "@/lib/catalogAnalysisData";
import type {
  CatalogArticle,
  CatalogFinding,
  PartCategory,
} from "@/lib/catalogAnalysisTypes";
import { CATEGORY_LABELS } from "@/lib/catalogAnalysisTypes";
import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";
import { getCurrentUser } from "@/lib/auth/user";
import {
  extractRowsFromMappedWorkbook,
  mergeExtractedParts,
  type ColumnMappingPayload,
  type ExtractedRow,
} from "@/lib/extractSpareParts";
import { persistSparePartsForCompany } from "@/lib/persistSpareParts";
import { prisma } from "@/lib/prisma";
import { mapSparePart } from "@/lib/workspace/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CATEGORIES = Object.keys(CATEGORY_LABELS) as PartCategory[];
const EXCEL_EXT = new Set(["xlsx", "xls", "csv"]);
const AI_CODE_LIMIT = 80;

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
  findings: CatalogFinding[],
  articles: CatalogArticle[]
): Promise<{ findings: CatalogFinding[]; source: "anthropic" | "mock" }> {
  if (!getAnthropicKey()) {
    return { findings, source: "mock" };
  }

  const uncategorized = articles.filter((a) => a.category == null);
  const uniqueCodes = [
    ...new Map(
      articles.map((a) => [
        a.code,
        {
          code: a.code,
          description: a.description,
          obsolete: Boolean(a.obsoleteFlag),
        },
      ])
    ).values(),
  ];

  const result = await callAnthropicMessages({
    system: "Rispondi esclusivamente con JSON valido, senza markdown.",
    user: `Sei l'agente di pulizia catalogo ricambi di aftercore.
Proponi SOLO sostituzioni vecchio→nuovo e categorie per articoli senza categoria.
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
}`,
    maxTokens: 1200,
  });

  if (!result.ok) return { findings, source: "mock" };
  const fuzzy = parseFuzzyJson(result.text);
  if (!fuzzy) return { findings, source: "mock" };

  let next = findings.filter((f) => f.kind !== "substitution");
  const byCode = new Map<string, CatalogArticle>();
  for (const a of articles) {
    if (!byCode.has(a.code)) byCode.set(a.code, a);
  }

  if (fuzzy.substitutions && fuzzy.substitutions.length > 0) {
    for (const sub of fuzzy.substitutions) {
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
    next = [...next, ...findSubstitutionsMock(articles)];
  }

  if (fuzzy.categories?.length) {
    next = next.map((f) => {
      if (f.kind !== "missing_price" || !f.detail?.categoryMissing) return f;
      const code = f.codes[0];
      const cat = fuzzy.categories!.find((c) => c.code === code);
      if (!cat || !CATEGORIES.includes(cat.category)) return f;
      const article = byCode.get(code);
      if (!article?.purchasePrice) return f;
      return {
        ...f,
        confidence: Math.max(f.confidence, Number(cat.confidence) || 0.8),
        summary: `Categoria proposta: ${CATEGORY_LABELS[cat.category]}. Prezzo da acquisto × moltiplicatore.`,
        priceProposal: proposePrice(article.purchasePrice, cat.category),
        detail: {
          ...f.detail,
          categoryMissing: false,
          categorySource: "anthropic",
        },
        source: "anthropic",
      };
    });
  }

  return { findings: next, source: "anthropic" };
}

async function analyzeArticles(articles: CatalogArticle[]) {
  const summary = buildCatalogSummary(articles);
  let findings = runDeterministicAnalysis(articles);
  let source: "anthropic" | "mock" = "mock";
  const uniqueCodes = new Set(articles.map((a) => a.code)).size;
  if (uniqueCodes <= AI_CODE_LIMIT) {
    const enriched = await enrichWithAnthropic(findings, articles);
    findings = enriched.findings;
    source = enriched.source;
  }
  return {
    summary,
    findings,
    impact: buildImpact(findings),
    source,
    sources: CATALOG_SOURCES,
    articles,
  };
}

async function extractFromForm(
  form: FormData,
  mappings: Record<string, ColumnMappingPayload>
): Promise<ExtractedRow[]> {
  const blobs = form.getAll("files");
  const ids = form.getAll("fileIds");
  const extracted: ExtractedRow[] = [];

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    if (!(blob instanceof File)) continue;
    const name = blob.name || `catalogo-${i + 1}.xlsx`;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXCEL_EXT.has(ext)) continue;
    const fileId =
      typeof ids[i] === "string" && ids[i] ? String(ids[i]) : name;
    const mapping =
      mappings[fileId] ??
      mappings[name] ??
      (Object.keys(mappings).length === 1
        ? Object.values(mappings)[0]
        : undefined);
    if (!mapping) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    try {
      extracted.push(
        ...(await extractRowsFromMappedWorkbook(buffer, name, fileId, mapping))
      );
    } catch (err) {
      console.error("catalog extract fail", name, err);
    }
  }
  return extracted;
}

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const form = await req.formData();
    const mappingsRaw = form.get("mappings");
    if (typeof mappingsRaw !== "string" || !mappingsRaw.trim()) {
      return NextResponse.json(
        {
          error:
            "Mappatura colonne mancante. Conferma la schermata di mapping.",
        },
        { status: 400 }
      );
    }

    let mappings: Record<string, ColumnMappingPayload>;
    try {
      mappings = JSON.parse(mappingsRaw) as Record<
        string,
        ColumnMappingPayload
      >;
    } catch {
      return NextResponse.json(
        { error: "Mappatura colonne non valida." },
        { status: 400 }
      );
    }

    try {
      const extracted = await extractFromForm(form, mappings);
      const articles = extractedRowsToCatalogArticles(extracted);
      if (articles.length === 0) {
        return NextResponse.json(
          {
            error:
              "Nessun ricambio estratto. Controlla che almeno una colonna sia mappata su Codice (o su Codice OEM / MPN).",
          },
          { status: 400 }
        );
      }

      const existing = await prisma.sparePart.findMany({
        where: { companyId: me.companyId },
      });
      const merged = mergeExtractedParts(
        existing.map(mapSparePart),
        extracted
      );
      const extractedCodes = new Set(
        extracted.map((r) => r.codice.toUpperCase())
      );
      const toSave = merged.filter((p) =>
        extractedCodes.has(p.codice.toUpperCase())
      );
      const saved = await persistSparePartsForCompany(me.companyId, toSave);
      const result = await analyzeArticles(articles);
      return NextResponse.json({
        ...result,
        persisted: true,
        importedRows: extracted.length,
        sparePartsCount: saved.length,
      });
    } catch (err) {
      console.error("catalog-analyze import fail", err);
      const message =
        err instanceof Error ? err.message : "Errore interno durante l'import.";
      return NextResponse.json(
        { error: `Importazione fallita: ${message}` },
        { status: 500 }
      );
    }
  }

  const result = await analyzeArticles(DEMO_CATALOG_ARTICLES);
  return NextResponse.json({
    ...result,
    persisted: false,
    importedRows: 0,
    sparePartsCount: 0,
  });
}
