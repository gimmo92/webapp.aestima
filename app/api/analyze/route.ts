import { NextResponse } from "next/server";
import { mockAnalyze } from "@/lib/mockAnalyze";
import type { AnalysisResult, Urgency } from "@/lib/types";

// =============================================================
// POST /api/analyze
// -------------------------------------------------------------
// Route server-side che interpreta la richiesta cliente.
//
// - Se ANTHROPIC_API_KEY è impostata → chiama davvero Claude e
//   restituisce il JSON strutturato { macchina, numero_serie,
//   componente_identificato, urgenza, note }.
// - Se la chiave NON c'è (o la chiamata fallisce) → fallback ai
//   dati mock, così la demo funziona sempre.
//
// NB: la chiave NON è mai hardcodata. Va impostata come env var.
// =============================================================

export const runtime = "nodejs";

// System prompt: istruisce Claude a fare estrazione strutturata.
const SYSTEM_PROMPT = `Sei l'agente di analisi di "aestima", un sistema che aiuta i tecnici del ricambistica industriale.
Ricevi una richiesta di ricambio scritta da un cliente in linguaggio naturale (spesso vaga, senza codici).
Il tuo compito è ESTRARRE le informazioni chiave e restituirle in JSON.

Estrai:
- macchina: modello/descrizione della macchina se deducibile, altrimenti "Da identificare".
- numero_serie: il numero di serie/matricola citato (es. "MX-4521"), stringa vuota se assente.
- componente_identificato: descrizione breve del componente rotto/richiesto in linguaggio naturale (es. "componente di tenuta").
- urgenza: uno tra "bassa", "normale", "alta". Usa "alta" se il cliente indica urgenza, fermo macchina, "subito", "urgente".
- note: una frase sintetica di sintesi per il tecnico.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo, senza backtick, senza markdown.
Schema: {"macchina": string, "numero_serie": string, "componente_identificato": string, "urgenza": "bassa"|"normale"|"alta", "note": string}`;

// Modello Claude usato (configurabile via env, con default recente).
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

function coerceUrgency(value: unknown): Urgency {
  return value === "alta" || value === "bassa" ? value : "normale";
}

/** Estrae il primo blocco JSON valido dal testo di risposta di Claude. */
function parseClaudeJson(text: string): Partial<AnalysisResult> | null {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function POST(req: Request) {
  let request = "";
  try {
    const body = await req.json();
    request = typeof body?.request === "string" ? body.request : "";
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido." },
      { status: 400 }
    );
  }

  if (!request.trim()) {
    return NextResponse.json(
      { error: "La richiesta del cliente è vuota." },
      { status: 400 }
    );
  }

  // API key Anthropic da impostare in env var ANTHROPIC_API_KEY su Vercel.
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Nessuna chiave → fallback mock (la demo funziona comunque).
  if (!apiKey) {
    return NextResponse.json(mockAnalyze(request));
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: request }],
      }),
    });

    if (!res.ok) {
      // Errore lato Anthropic → non blocchiamo la demo, usiamo il mock.
      console.error("Anthropic API error:", res.status, await res.text());
      return NextResponse.json(mockAnalyze(request));
    }

    const data = await res.json();
    const text: string =
      data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";

    const parsed = parseClaudeJson(text);
    if (!parsed) {
      return NextResponse.json(mockAnalyze(request));
    }

    const result: AnalysisResult = {
      macchina: String(parsed.macchina ?? "Da identificare"),
      numero_serie: String(parsed.numero_serie ?? ""),
      componente_identificato: String(
        parsed.componente_identificato ?? "componente non specificato"
      ),
      urgenza: coerceUrgency(parsed.urgenza),
      note: String(parsed.note ?? ""),
      source: "anthropic",
    };

    return NextResponse.json(result);
  } catch (err) {
    // Rete/timeout/parse → fallback mock, la demo non si interrompe mai.
    console.error("Analyze route error:", err);
    return NextResponse.json(mockAnalyze(request));
  }
}
