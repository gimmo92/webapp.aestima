import { NextResponse } from "next/server";
import {
  callAnthropicMessages,
  getAnthropicKey,
} from "@/lib/anthropicKey";
import type { KnowledgeEntry } from "@/lib/knowledgeTypes";

// =============================================================
// POST /api/knowledge-consolidate
// Fonde voci KB simili in una scheda autorevole (demo "Consolida").
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ConsolidatedPayload {
  symptom?: string;
  probableCause?: string;
  solution?: string;
  spareParts?: { code?: string; description?: string }[];
  tags?: string[];
}

function parseJson(text: string): ConsolidatedPayload | null {
  try {
    return JSON.parse(text) as ConsolidatedPayload;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ConsolidatedPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(req: Request) {
  let entries: KnowledgeEntry[];
  try {
    const body = await req.json();
    entries = body.entries as KnowledgeEntry[];
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido." },
      { status: 400 }
    );
  }

  if (!Array.isArray(entries) || entries.length < 2) {
    return NextResponse.json(
      { error: "Servono almeno 2 voci da consolidare." },
      { status: 400 }
    );
  }

  const apiKey = getAnthropicKey();
  const totalFrequency = entries.reduce((s, e) => s + e.frequency, 0);
  const machineModel = entries[0].machineModel;
  const machineSerial = entries[0].machineSerial;

  if (!apiKey) {
    return NextResponse.json({
      entry: buildFallbackConsolidated(entries, totalFrequency),
      source: "fallback" as const,
    });
  }

  const entriesBlock = entries
    .map(
      (e, i) =>
        `--- Voce ${i + 1} (${e.id}, freq. ${e.frequency}) ---\nSintomo: ${e.symptom}\nCausa: ${e.probableCause}\nSoluzione: ${e.solution}\nRicambi: ${e.spareParts.map((p) => p.code).join(", ") || "nessuno"}`
    )
    .join("\n\n");

  const userPrompt = [
    `Consolida queste ${entries.length} voci della knowledge base sulla stessa macchina (${machineModel}${machineSerial ? ` / ${machineSerial}` : ""}) in UNA scheda autorevole, ben scritta, pronta per un manuale tecnico.`,
    "",
    entriesBlock,
    "",
    `Frequenza totale occorrenze da indicare nel testo: ${totalFrequency}.`,
    "",
    "Rispondi SOLO con JSON:",
    `{
  "symptom": "sintomo unificato e generalizzato",
  "probableCause": "causa probabile consolidata",
  "solution": "procedura soluzione completa e chiara",
  "spareParts": [{"code":"...","description":"..."}],
  "tags": ["tag1","tag2"]
}`,
  ].join("\n");

  try {
    const llm = await callAnthropicMessages({
      system:
        "Sei un redattore tecnico che crea schede troubleshooting per un manuale service. Unisci ridondanze, mantieni precisione. Italiano.",
      user: userPrompt,
      maxTokens: 1200,
    });

    if (!llm.ok) {
      return NextResponse.json({
        entry: buildFallbackConsolidated(entries, totalFrequency),
        source: "fallback" as const,
      });
    }

    const parsed = parseJson(llm.text);
    if (!parsed?.symptom?.trim() || !parsed.solution?.trim()) {
      return NextResponse.json({
        entry: buildFallbackConsolidated(entries, totalFrequency),
        source: "fallback" as const,
      });
    }

    const spareParts = Array.isArray(parsed.spareParts)
      ? parsed.spareParts
          .map((p) => ({
            code: String(p.code ?? "").trim(),
            description: String(p.description ?? "").trim(),
          }))
          .filter((p) => p.code || p.description)
      : mergeSpareParts(entries);

    return NextResponse.json({
      entry: {
        machineModel,
        machineSerial,
        problemCategory: entries[0].problemCategory,
        symptom: parsed.symptom.trim(),
        probableCause:
          parsed.probableCause?.trim() ||
          entries[0].probableCause,
        solution: parsed.solution.trim(),
        spareParts,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
          : [...new Set(entries.flatMap((e) => e.tags))],
        frequency: totalFrequency,
      },
      source: "anthropic" as const,
    });
  } catch (err) {
    console.error("Knowledge consolidate error:", err);
    return NextResponse.json({
      entry: buildFallbackConsolidated(entries, totalFrequency),
      source: "fallback" as const,
    });
  }
}

function mergeSpareParts(entries: KnowledgeEntry[]) {
  const seen = new Set<string>();
  const out: { code: string; description: string }[] = [];
  for (const e of entries) {
    for (const p of e.spareParts) {
      const key = p.code || p.description;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function buildFallbackConsolidated(
  entries: KnowledgeEntry[],
  totalFrequency: number
) {
  const primary = entries.sort((a, b) => b.frequency - a.frequency)[0];
  return {
    machineModel: primary.machineModel,
    machineSerial: primary.machineSerial,
    problemCategory: primary.problemCategory,
    symptom: primary.symptom,
    probableCause: primary.probableCause,
    solution: entries.map((e) => e.solution).join("\n\n"),
    spareParts: mergeSpareParts(entries),
    tags: [...new Set(entries.flatMap((e) => e.tags))],
    frequency: totalFrequency,
  };
}
