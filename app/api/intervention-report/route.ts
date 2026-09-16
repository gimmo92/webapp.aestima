import { NextResponse } from "next/server";
import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";
import {
  buildReportDraftFallback,
  todayDateLabel,
  type CustomerSentiment,
  type ReportDraft,
  type ReportDraftInput,
} from "@/lib/interventionReportDraft";
import type {
  InterventionReportOutcome,
  InterventionReportType,
} from "@/lib/technicianTypes";

// =============================================================
// POST /api/intervention-report
// Trasforma vocali trascritti, note scritte e documenti allegati
// in una bozza strutturata di rapporto d'intervento.
// Se la chiave Anthropic manca o la chiamata fallisce, risponde
// comunque con la bozza deterministica di fallback.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES: InterventionReportType[] = [
  "manutenzione",
  "riparazione",
  "sostituzione",
  "verifica",
  "installazione",
];

const OUTCOMES: InterventionReportOutcome[] = [
  "completato",
  "parziale",
  "followup",
];

const SENTIMENTS: CustomerSentiment[] = ["positivo", "neutro", "critico"];

interface DraftPayload {
  machineModel?: string;
  machineSerial?: string | null;
  type?: string;
  outcome?: string;
  hours?: number | string;
  summary?: string;
  workPerformed?: string;
  partsUsed?: unknown;
  followUp?: string | null;
  customerFeedback?: string | null;
  customerSentiment?: string;
  customerRequests?: unknown;
}

function parseJson(text: string): DraftPayload | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(trimmed) as DraftPayload;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as DraftPayload;
    } catch {
      return null;
    }
  }
}

function coerceType(raw: string | undefined): InterventionReportType {
  const value = (raw ?? "").toLowerCase() as InterventionReportType;
  return TYPES.includes(value) ? value : "manutenzione";
}

function coerceOutcome(raw: string | undefined): InterventionReportOutcome {
  const value = (raw ?? "").toLowerCase() as InterventionReportOutcome;
  return OUTCOMES.includes(value) ? value : "completato";
}

function coerceSentiment(
  raw: string | undefined,
  feedback: string | undefined
): CustomerSentiment | undefined {
  const value = (raw ?? "").toLowerCase() as CustomerSentiment;
  if (SENTIMENTS.includes(value)) return value;
  return feedback?.trim() ? "neutro" : undefined;
}

function coerceHours(raw: number | string | undefined): number {
  const value =
    typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."));
  return Number.isFinite(value) && value > 0 && value < 24 ? value : 1;
}

function buildPrompt(input: ReportDraftInput): string {
  const sources = input.sources
    .map((source, index) => {
      const head = `[${index + 1}] ${source.kind.toUpperCase()} — ${source.label}`;
      return source.excerpt ? `${head}\n${source.excerpt}` : head;
    })
    .join("\n\n");

  return [
    "Scrivi il rapporto d'intervento a partire da queste fonti raccolte su WhatsApp.",
    "",
    `Tecnico: ${input.technicianName}`,
    input.customerCompany ? `Cliente: ${input.customerCompany}` : "",
    input.machineHint ? `Macchina indicata in scheda: ${input.machineHint}` : "",
    `Data odierna: ${todayDateLabel()}`,
    "",
    input.notes?.trim() ? `Note dell'operatore:\n${input.notes.trim()}` : "",
    input.feedbackNotes?.trim()
      ? `Riscontro del cliente riferito dal tecnico:\n${input.feedbackNotes.trim()}`
      : "",
    "",
    sources ? `Fonti:\n${sources}` : "Nessuna fonte allegata.",
    "",
    "Il riscontro del cliente è la parte più importante del rapporto: riporta",
    "commenti, lamentele, richieste e grado di soddisfazione anche quando non",
    "riguardano il guasto (ergonomia, costi, modelli alternativi, tempi).",
    "Non scartare mai queste informazioni e non spostarle nei lavori eseguiti.",
    "",
    "Rispondi SOLO con JSON valido (senza markdown):",
    `{
  "machineModel": "modello macchina",
  "machineSerial": "matricola o null",
  "type": "manutenzione" | "riparazione" | "sostituzione" | "verifica" | "installazione",
  "outcome": "completato" | "parziale" | "followup",
  "hours": 2.5,
  "summary": "una riga che sintetizza l'intervento, max 120 caratteri",
  "workPerformed": "lavori eseguiti in prosa tecnica, 3-6 frasi, senza elenco puntato",
  "partsUsed": ["CODICE-RICAMBIO"],
  "followUp": "cosa resta da fare, oppure null",
  "customerFeedback": "cosa ha detto il cliente sull'intervento e sulla macchina, nelle sue parole, oppure null",
  "customerSentiment": "positivo" | "neutro" | "critico",
  "customerRequests": ["richieste commerciali da girare alle vendite"]
}`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function POST(req: Request) {
  let body: ReportDraftInput;
  try {
    body = (await req.json()) as ReportDraftInput;
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido." },
      { status: 400 }
    );
  }

  if (!body?.technicianName?.trim()) {
    return NextResponse.json(
      { error: "Il nome del tecnico è obbligatorio." },
      { status: 400 }
    );
  }

  const input: ReportDraftInput = {
    ...body,
    sources: Array.isArray(body.sources) ? body.sources : [],
  };

  const hasContent =
    Boolean(input.notes?.trim()) ||
    Boolean(input.feedbackNotes?.trim()) ||
    input.sources.some((source) => source.excerpt?.trim() || source.label?.trim());

  if (!hasContent) {
    return NextResponse.json(
      { error: "Serve almeno una fonte: un vocale, del testo o un documento." },
      { status: 400 }
    );
  }

  const fallback = buildReportDraftFallback(input);

  if (!getAnthropicKey()) {
    return NextResponse.json({
      draft: fallback,
      source: "fallback" as const,
      warning: "Servizio AI non configurato: bozza compilata con regole locali.",
    });
  }

  try {
    const llm = await callAnthropicMessages({
      system:
        "Sei un tecnico service senior che redige rapporti d'intervento su macchinari industriali. Usi solo le informazioni presenti nelle fonti, non inventi ricambi, misure o esiti. Scrivi in italiano tecnico, asciutto e professionale. Se un dato manca, lo ometti invece di inventarlo. Riporti sempre il riscontro del cliente, anche quando è un commento commerciale o di ergonomia estraneo al guasto.",
      user: buildPrompt(input),
      maxTokens: 1024,
    });

    if (!llm.ok) {
      console.error("Intervention report Anthropic fallback:", llm.message);
      return NextResponse.json({
        draft: fallback,
        source: "fallback" as const,
        warning: llm.message,
      });
    }

    const parsed = parseJson(llm.text);
    if (!parsed?.summary?.trim() || !parsed.workPerformed?.trim()) {
      console.error(
        "Intervention report JSON parse fallback — raw:",
        llm.text.slice(0, 400)
      );
      return NextResponse.json({
        draft: fallback,
        source: "fallback" as const,
        warning: "Risposta AI non interpretabile: uso la bozza locale.",
      });
    }

    const partsUsed = Array.isArray(parsed.partsUsed)
      ? parsed.partsUsed
          .map((part) => String(part).trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];

    const customerRequests = Array.isArray(parsed.customerRequests)
      ? parsed.customerRequests
          .map((request) => String(request).trim())
          .filter(Boolean)
          .slice(0, 6)
      : fallback.customerRequests ?? [];

    const customerFeedback =
      parsed.customerFeedback?.trim() || fallback.customerFeedback;

    const draft: ReportDraft = {
      machineModel:
        parsed.machineModel?.trim() || fallback.machineModel,
      machineSerial:
        parsed.machineSerial?.trim() || fallback.machineSerial,
      interventionDate: fallback.interventionDate,
      type: coerceType(parsed.type),
      outcome: coerceOutcome(parsed.outcome),
      hours: coerceHours(parsed.hours),
      summary: parsed.summary.trim(),
      workPerformed: parsed.workPerformed.trim(),
      partsUsed,
      followUp: parsed.followUp?.trim() || undefined,
      customerFeedback,
      customerSentiment: coerceSentiment(
        parsed.customerSentiment,
        customerFeedback
      ),
      customerRequests,
    };

    return NextResponse.json({ draft, source: "anthropic" as const });
  } catch (err) {
    console.error("Intervention report error:", err);
    return NextResponse.json({
      draft: fallback,
      source: "fallback" as const,
      warning: "Errore imprevisto verso l'AI: bozza compilata localmente.",
    });
  }
}
