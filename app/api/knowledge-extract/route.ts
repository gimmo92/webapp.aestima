import { NextResponse } from "next/server";
import {
  callAnthropicMessages,
  getAnthropicKey,
} from "@/lib/anthropicKey";
import type { ExtractKnowledgeInput } from "@/lib/knowledgeTypes";

// =============================================================
// POST /api/knowledge-extract
// Trasforma la soluzione di un ticket chiuso in voce KB strutturata.
// Chiama Anthropic per generalizzare sintomo/causa/soluzione.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ExtractedPayload {
  machineModel?: string;
  machineSerial?: string;
  problemCategory?: string;
  symptom?: string;
  probableCause?: string;
  solution?: string;
  spareParts?: { code?: string; description?: string }[];
  tags?: string[];
}

function parseJson(text: string): ExtractedPayload | null {
  try {
    return JSON.parse(text) as ExtractedPayload;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ExtractedPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceCategory(raw: string | undefined): ExtractedPayload["problemCategory"] {
  const v = (raw ?? "").toLowerCase();
  if (v === "ricambio" || v === "manutenzione" || v === "altro") return v;
  return "troubleshooting";
}

export async function POST(req: Request) {
  let body: ExtractKnowledgeInput;
  try {
    body = (await req.json()) as ExtractKnowledgeInput;
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido." },
      { status: 400 }
    );
  }

  const solution = body.solution?.trim();
  if (!solution) {
    return NextResponse.json(
      { error: "La soluzione del tecnico è obbligatoria." },
      { status: 400 }
    );
  }

  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Servizio AI non configurato. Imposta anthropic o ANTHROPIC_API_KEY.",
        fallback: buildFallbackEntry(body, solution),
      },
      { status: 503 }
    );
  }

  const userPrompt = [
    "Estrai una scheda knowledge base strutturata da questo intervento chiuso.",
    "",
    `Ticket: ${body.ticketId}`,
    `Oggetto: ${body.summary}`,
    `Descrizione problema: ${body.description}`,
    `Macchina: ${body.machineModel ?? "n/d"} · Matricola: ${body.machineSerial ?? "n/d"}`,
    "",
    "Soluzione applicata dal tecnico:",
    solution,
    body.conversationContext
      ? `\nContesto conversazione chat:\n${body.conversationContext}`
      : "",
    "",
    "Rispondi SOLO con JSON valido (senza markdown):",
    `{
  "machineModel": "modello macchina",
  "machineSerial": "matricola o null",
  "problemCategory": "troubleshooting" | "ricambio" | "manutenzione" | "altro",
  "symptom": "sintomo generalizzato e riutilizzabile per casi futuri simili",
  "probableCause": "causa probabile in forma chiara",
  "solution": "soluzione applicata, passo-passo se utile",
  "spareParts": [{"code":"...","description":"..."}],
  "tags": ["tag1","tag2"]
}`,
  ].join("\n");

  try {
    const llm = await callAnthropicMessages({
      system:
        "Sei un ingegnere service che documenta interventi in una knowledge base aziendale. Generalizza i sintomi (non copiare testo cliente verbatim se troppo specifico). Usa solo informazioni presenti nel ticket. Italiano.",
      user: userPrompt,
      maxTokens: 1024,
    });

    if (!llm.ok) {
      return NextResponse.json(
        { error: llm.message, fallback: buildFallbackEntry(body, solution) },
        { status: 502 }
      );
    }

    const parsed = parseJson(llm.text);
    if (!parsed?.symptom?.trim() || !parsed.solution?.trim()) {
      return NextResponse.json(
        {
          error: "Estrazione non valida.",
          fallback: buildFallbackEntry(body, solution),
        },
        { status: 502 }
      );
    }

    const spareParts = Array.isArray(parsed.spareParts)
      ? parsed.spareParts
          .map((p) => ({
            code: String(p.code ?? "").trim(),
            description: String(p.description ?? "").trim(),
          }))
          .filter((p) => p.code || p.description)
      : [];

    return NextResponse.json({
      entry: {
        machineModel:
          parsed.machineModel?.trim() ||
          body.machineModel?.trim() ||
          "Macchina non specificata",
        machineSerial:
          parsed.machineSerial?.trim() || body.machineSerial?.trim(),
        problemCategory: coerceCategory(parsed.problemCategory),
        symptom: parsed.symptom.trim(),
        probableCause:
          parsed.probableCause?.trim() ||
          "Causa da confermare in campo.",
        solution: parsed.solution.trim(),
        spareParts,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
          : [],
      },
      source: "anthropic" as const,
    });
  } catch (err) {
    console.error("Knowledge extract error:", err);
    return NextResponse.json(
      {
        error: "Errore imprevisto durante l'estrazione.",
        fallback: buildFallbackEntry(body, solution),
      },
      { status: 500 }
    );
  }
}

function buildFallbackEntry(body: ExtractKnowledgeInput, solution: string) {
  return {
    machineModel: body.machineModel?.trim() || "Macchina non specificata",
    machineSerial: body.machineSerial?.trim(),
    problemCategory: "troubleshooting" as const,
    symptom: body.summary.trim(),
    probableCause: "Da analizzare — estrazione AI non disponibile.",
    solution,
    spareParts: [] as { code: string; description: string }[],
    tags: [] as string[],
  };
}
