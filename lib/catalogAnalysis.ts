import { CATALOG_SOURCES } from "./catalogAnalysisData";
import type {
  CatalogArticle,
  CatalogFinding,
  CatalogSummary,
  ImpactSummary,
  PartCategory,
  PriceProposal,
} from "./catalogAnalysisTypes";
import {
  CATEGORY_MULTIPLIERS,
  HIGH_CONFIDENCE_THRESHOLD,
  MINUTES_PER_FINDING_MANUAL,
} from "./catalogAnalysisTypes";

function sourceLabel(id: CatalogArticle["sourceId"]): string {
  return CATALOG_SOURCES.find((s) => s.id === id)?.label ?? id;
}

function normalizeDesc(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function descTokens(s: string): Set<string> {
  return new Set(
    normalizeDesc(s)
      .split(/\s+/)
      .filter((t) => t.length > 2)
  );
}

/** Similarità Jaccard grezza sulle parole (fallback mock fuzzy). */
export function descriptionSimilarity(a: string, b: string): number {
  const ta = descTokens(a);
  const tb = descTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter += 1;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function proposePrice(
  purchasePrice: number,
  category: PartCategory
): PriceProposal {
  const multiplier = CATEGORY_MULTIPLIERS[category];
  return {
    purchasePrice,
    category,
    multiplier,
    proposedPrice: Math.round(purchasePrice * multiplier * 100) / 100,
  };
}

export function buildCatalogSummary(articles: CatalogArticle[]): CatalogSummary {
  const bySource = new Map<CatalogArticle["sourceId"], number>();
  const codes = new Set<string>();
  let withPrice = 0;
  let inErp = 0;

  for (const a of articles) {
    bySource.set(a.sourceId, (bySource.get(a.sourceId) ?? 0) + 1);
    codes.add(a.code);
    if (a.listPrice != null) withPrice += 1;
    if (a.inErp) inErp += 1;
  }

  const sources = CATALOG_SOURCES.filter((s) => (bySource.get(s.id) ?? 0) > 0).map(
    (s) => ({
      id: s.id,
      label: s.label,
      count: bySource.get(s.id) ?? 0,
    })
  );

  return {
    articleCount: articles.length,
    uniqueCodes: codes.size,
    sources,
    withPrice,
    withoutPrice: articles.length - withPrice,
    inErp,
    notInErp: articles.length - inErp,
  };
}

export function buildImpact(findings: CatalogFinding[]): ImpactSummary {
  const high = findings.filter((f) => f.confidence >= HIGH_CONFIDENCE_THRESHOLD)
    .length;
  return {
    totalFindings: findings.length,
    highConfidence: high,
    needsReview: findings.length - high,
    estimatedMinutesSaved: findings.length * MINUTES_PER_FINDING_MANUAL,
  };
}

/** Coppie di sostituzione note (vecchio → nuovo) per il mock fuzzy. */
const KNOWN_SUBSTITUTIONS: {
  oldCode: string;
  newCode: string;
  confidence: number;
  reason: string;
}[] = [
  {
    oldCode: "VLM-400-009",
    newCode: "VLM-400-009/2",
    confidence: 0.93,
    reason:
      "Codice base fuori produzione: su VLM-2200 usare /2 (L=2250); su VLM-1800 usare /1 (L=1950).",
  },
  {
    oldCode: "VLM-300-004-SI",
    newCode: "VLM-300-004",
    confidence: 0.91,
    reason:
      "Ventosa silicone dedicata a VLM 1600 legacy; sul 2200 la sostituta è NBR D.50.",
  },
  {
    oldCode: "VLM-400-022",
    newCode: "VLM-400-022A",
    confidence: 0.78,
    reason:
      "Stesso pezzo in revisione A (POM rinforzato): candidati a mappatura succedaneo.",
  },
  {
    oldCode: "VLM-1600-VENT-OLD",
    newCode: "VLM-300-004",
    confidence: 0.72,
    reason:
      "Gruppo ventose legacy VLM 1600; pezzo funzionale più vicino nel listino attuale.",
  },
];

function findDuplicates(articles: CatalogArticle[]): CatalogFinding[] {
  const byCode = new Map<string, CatalogArticle[]>();
  for (const a of articles) {
    const list = byCode.get(a.code) ?? [];
    list.push(a);
    byCode.set(a.code, list);
  }

  const out: CatalogFinding[] = [];
  for (const [code, rows] of byCode) {
    if (rows.length < 2) continue;
    const sources = [...new Set(rows.map((r) => sourceLabel(r.sourceId)))];
    const descs = [...new Set(rows.map((r) => r.description))];
    const descDiff = descs.length > 1;
    out.push({
      id: `dup-${code}`,
      kind: "duplicate",
      confidence: descDiff ? 0.88 : 0.96,
      title: `Codice ${code} in ${rows.length} cataloghi`,
      summary: descDiff
        ? `Presente in ${sources.join(", ")} con descrizioni diverse.`
        : `Presente in ${sources.join(", ")} con descrizione allineata.`,
      proposedAction: "Unificare in un'unica anagrafica e mantenere le occorrenze come riferimenti di pagina.",
      articleIds: rows.map((r) => r.id),
      codes: [code],
      detail: {
        appearances: rows.map((r) => ({
          source: sourceLabel(r.sourceId),
          location: r.location,
          description: r.description,
          listPrice: r.listPrice,
        })),
        descriptionVariants: descs,
      },
      source: "deterministic",
    });
  }
  return out;
}

function findObsolete(articles: CatalogArticle[]): CatalogFinding[] {
  const seen = new Set<string>();
  const out: CatalogFinding[] = [];
  for (const a of articles) {
    if (seen.has(a.code)) continue;
    const candidate =
      a.obsoleteFlag ||
      (a.movements24m === 0 && !a.erpAvailable && a.inErp);
    if (!candidate) continue;
    seen.add(a.code);
    out.push({
      id: `obs-${a.code}`,
      kind: "obsolete",
      confidence: a.obsoleteFlag ? 0.94 : 0.82,
      title: `${a.code} candidato fuori produzione`,
      summary: a.obsoleteFlag
        ? "Segnato come fuori produzione / non ordinabile a gestionale."
        : "Nessuna movimentazione negli ultimi 24 mesi e non disponibile a magazzino gestionale.",
      proposedAction:
        "Marcare come obsoleto e annotare sul catalogo (con eventuale succedaneo).",
      articleIds: [a.id],
      codes: [a.code],
      detail: {
        description: a.description,
        movements24m: a.movements24m,
        erpAvailable: a.erpAvailable,
        source: sourceLabel(a.sourceId),
        location: a.location,
      },
      source: "deterministic",
    });
  }
  return out;
}

function findErpDiscrepancies(articles: CatalogArticle[]): CatalogFinding[] {
  const byCode = new Map<string, CatalogArticle[]>();
  for (const a of articles) {
    const list = byCode.get(a.code) ?? [];
    list.push(a);
    byCode.set(a.code, list);
  }

  const out: CatalogFinding[] = [];
  for (const [code, rows] of byCode) {
    const anyCatalog = rows.some((r) => r.sourceId !== "gestionale");
    if (!anyCatalog) continue;

    const missingErp = rows.every((r) => !r.inErp);
    if (missingErp) {
      out.push({
        id: `erp-miss-${code}`,
        kind: "erp_discrepancy",
        confidence: 0.97,
        title: `${code} sul catalogo ma assente a gestionale`,
        summary: "Articolo presente in catalogo/distinta ma non in anagrafica ERP.",
        proposedAction: "Creare anagrafica a gestionale o rimuovere dal catalogo attivo.",
        articleIds: rows.map((r) => r.id),
        codes: [code],
        detail: {
          type: "missing_in_erp",
          appearances: rows.map((r) => ({
            source: sourceLabel(r.sourceId),
            location: r.location,
            description: r.description,
          })),
        },
        source: "deterministic",
      });
      continue;
    }

    const withErp = rows.find((r) => r.inErp && r.erpPrice != null);
    const withList = rows.find((r) => r.listPrice != null);
    if (
      withErp &&
      withList &&
      withErp.erpPrice != null &&
      withList.listPrice != null &&
      Math.abs(withErp.erpPrice - withList.listPrice) > 0.5
    ) {
      out.push({
        id: `erp-price-${code}`,
        kind: "erp_discrepancy",
        confidence: 0.9,
        title: `${code}: prezzo catalogo ≠ gestionale`,
        summary: `Listino €${withList.listPrice.toFixed(2)} vs ERP €${withErp.erpPrice.toFixed(2)}.`,
        proposedAction: "Allineare il listino al gestionale (o aggiornare l'ERP).",
        articleIds: rows.map((r) => r.id),
        codes: [code],
        detail: {
          type: "price_mismatch",
          catalogPrice: withList.listPrice,
          erpPrice: withErp.erpPrice,
          erpDescription: withErp.erpDescription ?? null,
        },
        source: "deterministic",
      });
    }
  }
  return out;
}

function findInconsistentDescriptions(
  articles: CatalogArticle[]
): CatalogFinding[] {
  const byCode = new Map<string, CatalogArticle[]>();
  for (const a of articles) {
    const list = byCode.get(a.code) ?? [];
    list.push(a);
    byCode.set(a.code, list);
  }

  const out: CatalogFinding[] = [];
  for (const [code, rows] of byCode) {
    if (rows.length < 2) continue;
    const variants = [...new Set(rows.map((r) => r.description))];
    if (variants.length < 2) continue;

    // Evita doppio conteggio con i soli duplicati: qui evidenzia il testo.
    let maxSim = 1;
    for (let i = 0; i < variants.length; i++) {
      for (let j = i + 1; j < variants.length; j++) {
        maxSim = Math.min(maxSim, descriptionSimilarity(variants[i], variants[j]));
      }
    }
    // Se troppo simili (quasi uguali) o troppo diversi, comunque segnala.
    out.push({
      id: `desc-${code}`,
      kind: "inconsistent_description",
      confidence: maxSim >= 0.35 ? 0.86 : 0.7,
      title: `${code}: descrizioni non allineate`,
      summary: `${variants.length} formulazioni diverse dello stesso codice.`,
      proposedAction: "Normalizzare sulla descrizione listino ufficiale.",
      articleIds: rows.map((r) => r.id),
      codes: [code],
      detail: {
        variants: rows.map((r) => ({
          source: sourceLabel(r.sourceId),
          location: r.location,
          description: r.description,
        })),
        suggestedCanonical: rows.find((r) => r.sourceId === "listino-2026")
          ?.description ?? variants[0],
      },
      source: "deterministic",
    });
  }
  return out;
}

function findMissingPrices(articles: CatalogArticle[]): CatalogFinding[] {
  const seen = new Set<string>();
  const out: CatalogFinding[] = [];
  for (const a of articles) {
    if (a.listPrice != null) continue;
    if (seen.has(a.code)) continue;
    if (a.purchasePrice == null) continue;
    seen.add(a.code);

    const category = a.category ?? "altro";
    const proposal = proposePrice(a.purchasePrice, category);
    out.push({
      id: `price-${a.code}`,
      kind: "missing_price",
      confidence: a.category ? 0.92 : 0.68,
      title: `${a.code}: prezzo di listino mancante`,
      summary: a.category
        ? `Proposto da acquisto × moltiplicatore ${category}.`
        : "Categoria assente: usata categoria di default «Altro» (da confermare).",
      proposedAction: "Applicare il prezzo proposto al listino dopo conferma esperto.",
      articleIds: [a.id],
      codes: [a.code],
      detail: {
        description: a.description,
        source: sourceLabel(a.sourceId),
        categoryMissing: a.category == null,
      },
      priceProposal: proposal,
      source: "deterministic",
    });
  }
  return out;
}

/** Sostituzioni da regole note (mock) — Anthropic può arricchirle in API. */
export function findSubstitutionsMock(
  articles: CatalogArticle[]
): CatalogFinding[] {
  const codes = new Set(articles.map((a) => a.code));
  const byCode = new Map<string, CatalogArticle>();
  for (const a of articles) {
    if (!byCode.has(a.code)) byCode.set(a.code, a);
  }

  const out: CatalogFinding[] = [];
  for (const sub of KNOWN_SUBSTITUTIONS) {
    if (!codes.has(sub.oldCode) || !codes.has(sub.newCode)) continue;
    const oldA = byCode.get(sub.oldCode)!;
    const newA = byCode.get(sub.newCode)!;
    out.push({
      id: `sub-${sub.oldCode}-${sub.newCode}`,
      kind: "substitution",
      confidence: sub.confidence,
      title: `${sub.oldCode} → ${sub.newCode}`,
      summary: sub.reason,
      proposedAction: `Mappare ${sub.oldCode} → ${sub.newCode} come succedaneo.`,
      articleIds: [oldA.id, newA.id],
      codes: [sub.oldCode, sub.newCode],
      detail: {
        old: {
          code: sub.oldCode,
          description: oldA.description,
        },
        new: {
          code: sub.newCode,
          description: newA.description,
        },
      },
      source: "mock",
    });
  }
  return out;
}

/**
 * Analisi deterministica completa + sostituzioni mock.
 * La parte fuzzy (sostituzioni / categorie) può essere sostituita da Anthropic in API.
 */
export function runDeterministicAnalysis(
  articles: CatalogArticle[]
): CatalogFinding[] {
  return [
    ...findDuplicates(articles),
    ...findObsolete(articles),
    ...findSubstitutionsMock(articles),
    ...findErpDiscrepancies(articles),
    ...findInconsistentDescriptions(articles),
    ...findMissingPrices(articles),
  ];
}
