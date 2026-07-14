import { NextResponse } from "next/server";
import {
  callAnthropicConversation,
  getAnthropicKey,
} from "@/lib/anthropicKey";
import { buildServiceContext } from "@/lib/serviceChatData";
import type {
  ChatMessage,
  ServiceChatResponse,
  ServiceTicket,
  SparePartProposal,
} from "@/lib/serviceChatTypes";

// =============================================================
// POST /api/service-chat
// -------------------------------------------------------------
// Agente di assistenza after-sales con Claude.
// Riceve l'intera cronologia (API stateless) + dati di contesto
// (macchine, distinte, KB troubleshooting) ad ogni richiesta.
//
// La chiave Anthropic resta server-side (env var "anthropic" o
// ANTHROPIC_API_KEY). Mai esposta al client.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVICE_CONTEXT = buildServiceContext();

const SYSTEM_PROMPT = `Sei l'agente di assistenza service after-sales di "aestima".
Parli in italiano, tono professionale e chiaro, come un tecnico esperto ma accessibile.

## FLUSSO OBBLIGATORIO
1. **Identifica la macchina**: chiedi modello o matricola se mancano. Estrai riferimenti anche da testo informale (es. "la rettifica del 2019 MX-4521"). Se più macchine condividono lo stesso modello (es. due IDC 114 TCZ con matricole diverse), chiedi di precisare la matricola o la variante.
2. **Capisci il bisogno**: distingui se l'utente cerca un RICAMBIO o ha un MALFUNZIONAMENTO da risolvere.
3. **Ramo ricambi**: cerca il pezzo SOLO nella distinta della macchina identificata. Proponi codice, descrizione, prezzo e disponibilità esattamente come nei dati.
4. **Ramo troubleshooting**: interroga sui sintomi, poi cerca nella base di conoscenza casi simili già risolti. Proponi la soluzione trovata, adattando il linguaggio alla conversazione.

## REGOLA CRITICA — MAI INVENTARE
- Se il pezzo NON è in distinta, o il problema NON ha casi simili nella KB: NON inventare codici, prezzi o soluzioni.
- Dichiara chiaramente che non hai la risposta nei dati disponibili.
- Proponi di aprire un ticket per un tecnico umano (imposta "ticket" nella risposta JSON).

## VINCOLI SUI DATI
Ragiona ESCLUSIVAMENTE sui dati nel contesto qui sotto. Non usare conoscenza esterna su modelli, codici o procedure non presenti.

## FORMATO RISPOSTA
Rispondi ESCLUSIVAMENTE con un oggetto JSON valido (senza markdown, senza backtick, senza testo fuori dal JSON):
{
  "message": "testo conversazionale per l'utente in italiano",
  "spareParts": null oppure [{"code":"...","description":"...","price":123.45,"availability":"disponibile"|"da_ordinare","leadTimeDays":0}],
  "ticket": null oppure {"summary":"breve descrizione del problema da escalare"}
}

Regole JSON:
- "message" è sempre obbligatorio.
- "spareParts": includi SOLO ricambi effettivamente trovati in distinta. availability "disponibile" se stock > 0, altrimenti "da_ordinare" con leadTimeDays.
- "ticket": imposta SOLO quando non trovi la risposta nei dati e proponi escalation a tecnico umano. NON generare un id ticket (lo assegna il server).
- Se stai solo raccogendo informazioni (es. chiedi matricola), spareParts e ticket restano null.

## DATI DI CONTESTO (unica fonte di verità)
${SERVICE_CONTEXT}`;

interface ParsedAgentPayload {
  message?: string;
  spareParts?: SparePartProposal[] | null;
  ticket?: { summary?: string } | null;
}

function parseAgentJson(text: string): ParsedAgentPayload | null {
  try {
    return JSON.parse(text) as ParsedAgentPayload;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as ParsedAgentPayload;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeSpareParts(raw: unknown): SparePartProposal[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const parts: SparePartProposal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const code = String(p.code ?? "").trim();
    const description = String(p.description ?? "").trim();
    const price = Number(p.price);
    const availability =
      p.availability === "da_ordinare" ? "da_ordinare" : "disponibile";
    if (!code || !description || Number.isNaN(price)) continue;
    parts.push({
      code,
      description,
      price,
      availability,
      leadTimeDays:
        typeof p.leadTimeDays === "number" ? p.leadTimeDays : undefined,
    });
  }
  return parts.length > 0 ? parts : undefined;
}

function generateTicketId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SRV-${n}`;
}

function buildTicket(raw: ParsedAgentPayload["ticket"]): ServiceTicket | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const summary = String(raw.summary ?? "").trim();
  if (!summary) return undefined;
  return { id: generateTicketId(), summary };
}

function coerceMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object") return null;
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return null;

  const result: ChatMessage[] = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const role = (m as { role?: string }).role;
    const content = String((m as { content?: string }).content ?? "").trim();
    if ((role !== "user" && role !== "assistant") || !content) continue;
    result.push({ role, content });
  }
  return result.length > 0 ? result : null;
}

export async function POST(req: Request) {
  let messages: ChatMessage[] | null = null;
  try {
    const body = await req.json();
    messages = coerceMessages(body);
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido." },
      { status: 400 }
    );
  }

  if (!messages) {
    return NextResponse.json(
      { error: "Cronologia messaggi mancante o non valida." },
      { status: 400 }
    );
  }

  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Servizio AI non configurato. Imposta la variabile d'ambiente anthropic o ANTHROPIC_API_KEY.",
      },
      { status: 503 }
    );
  }

  try {
    const llm = await callAnthropicConversation({
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 1536,
    });

    if (!llm.ok) {
      console.error("Service chat Anthropic error:", llm.message);
      return NextResponse.json(
        {
          error:
            "Al momento non riesco a rispondere. Riprova tra qualche istante o contatta l'assistenza telefonica.",
        },
        { status: llm.status === 429 ? 429 : 502 }
      );
    }

    const parsed = parseAgentJson(llm.text);
    if (!parsed?.message?.trim()) {
      return NextResponse.json(
        {
          error:
            "Risposta non valida dal servizio AI. Riprova con una domanda più specifica.",
        },
        { status: 502 }
      );
    }

    const response: ServiceChatResponse = {
      message: parsed.message.trim(),
      spareParts: normalizeSpareParts(parsed.spareParts),
      ticket: buildTicket(parsed.ticket),
      source: "anthropic",
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Service chat route error:", err);
    return NextResponse.json(
      {
        error:
          "Si è verificato un errore imprevisto. Riprova tra qualche istante.",
      },
      { status: 500 }
    );
  }
}
