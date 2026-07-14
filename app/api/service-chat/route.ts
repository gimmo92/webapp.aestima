import { NextResponse } from "next/server";
import {
  callAnthropicConversation,
  getAnthropicKey,
  type AnthropicChatTurn,
  type AnthropicContentBlock,
  type AnthropicImageMediaType,
} from "@/lib/anthropicKey";
import { formatKnowledgeForPrompt } from "@/lib/knowledgeData";
import {
  findKbCandidates,
  formatKbCandidatesForPrompt,
  formatTicketEscalationBlock,
  isReadyForKbSearch,
  isTicketEscalationIntent,
} from "@/lib/knowledgeSearch";
import { buildMachinesContext } from "@/lib/serviceChatData";
import { documentAttachmentNote } from "@/lib/serviceChatAttachments";
import { normalizeApiQuickReplies } from "@/lib/serviceChatQuickReplies";
import type { KnowledgeEntry } from "@/lib/knowledgeTypes";
import type {
  ChatAttachmentPayload,
  ChatMessage,
  KbMatchPreview,
  ServiceChatResponse,
  ServiceTicket,
  SparePartProposal,
} from "@/lib/serviceChatTypes";

// =============================================================
// POST /api/service-chat
// Agente assistenza after-sales — KB dinamica dal client a ogni richiesta.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MACHINES_CONTEXT = buildMachinesContext();

function buildSystemPrompt(
  knowledgeBase: KnowledgeEntry[],
  kbSearchBlock: string
): string {
  const kbContext = formatKnowledgeForPrompt(knowledgeBase);
  return `Sei l'agente di assistenza service after-sales di "aestima".
Parli in italiano, tono professionale e chiaro, come un tecnico esperto ma accessibile.

## FLUSSO OBBLIGATORIO
1. **Identifica la macchina**: chiedi modello o matricola se mancano.
2. **Capisci il bisogno**: distingui RICAMBIO vs MALFUNZIONAMENTO.
3. **Ramo ricambi**: cerca il pezzo SOLO nella distinta della macchina identificata.

## FLUSSO TROUBLESHOOTING — ORDINE RIGIDO (non saltare passi)
**Fase A** — Utente segnala malfunzionamento senza macchina:
- Chiedi matricola/modello. quickReplies con le macchine disponibili.
- NON cercare nella KB. kbMatch=null. NON proporre soluzioni.

**Fase B** — Utente indica SOLO la macchina (es. "Matricola MX-4521 — Rettificatrice RX-400"):
- Conferma brevemente la macchina identificata.
- Chiedi esplicitamente di **descrivere il guasto**: sintomi, comportamento anomalo, messaggi di errore, quando si manifesta.
- Proponi quickReplies con sintomi tipici. NON cercare nella KB. kbMatch=null. NON proporre soluzioni.

**Fase C** — Utente descrive il guasto (macchina già nota):
- SOLO ORA avvia la ricerca KB. La risposta DEVE iniziare con: "Un attimo, verifico nella knowledge base se questo problema è già stato risolto in passato…"
- Se trovi corrispondenza: spiega causa + soluzione + ricambi. Cita scheda [ID] nel Manuale. Imposta kbMatch.
- Se NON trovi: dopo la frase iniziale, dichiara che la KB non contiene il caso e proponi ticket.

**Fase D** — Utente chiede di aprire ticket (es. "Apri ticket", "Sì, procedi", dopo tua proposta di escalation):
- NON cercare nella KB. NON dire "verifico nella knowledge base".
- Conferma l'apertura e imposta "ticket" nel JSON. kbMatch=null.

## REGOLA PRIORITARIA — KNOWLEDGE BASE
- La KB è la prima fonte per i malfunzionamenti: cerca SEMPRE prima di escalare.
- Se trovi un caso simile (stesso sintomo/macchina): proponi la soluzione appresa da interventi precedenti.
- **NON aprire un ticket** se la KB ha già una soluzione applicabile.
- Imposta "kbMatch" con l'id esatto della voce (es. "KB-101") e un breve sintomo.
- Nel "message" includi sempre la referenza alla scheda KB quando usi una voce.

## ALLEGATI
- Analizza le FOTO per matricola, modello, codici o sintomi visibili.
- Per DOCUMENTI non visualizzabili usa il nome file e proponi escalation se serve.

## REGOLA CRITICA — MAI INVENTARE
- Se il pezzo NON è in distinta, o il problema NON ha casi simili nella KB: NON inventare.
- Solo allora proponi ticket (imposta "ticket" nel JSON).

## VINCOLI
Ragiona ESCLUSIVAMENTE sui dati nel contesto. Non usare conoscenza esterna.

## FORMATO RISPOSTA
Rispondi ESCLUSIVAMENTE con JSON valido (senza markdown):
{
  "message": "testo per l'utente in italiano",
  "spareParts": null oppure [{"code":"...","description":"...","price":123.45,"availability":"disponibile"|"da_ordinare","leadTimeDays":0}],
  "ticket": null oppure {"summary":"..."},
  "kbMatch": null oppure {"entryId":"KB-101","symptom":"breve sintomo della voce usata"},
  "quickReplies": null oppure [{"label":"...","value":"..."}]
}

Regole JSON:
- "message" sempre obbligatorio.
- "kbMatch": SOLO quando risolvi usando la KB — NON aprire ticket nello stesso messaggio.
- "ticket": SOLO se KB e distinta non hanno la risposta.
- "quickReplies": 2-5 opzioni quando chiedi scelte; sintomi dalla KB se troubleshooting.

## DATI DI CONTESTO (unica fonte di verità)
${MACHINES_CONTEXT}

${kbContext}

${kbSearchBlock}`;
}

interface ParsedAgentPayload {
  message?: string;
  spareParts?: SparePartProposal[] | null;
  ticket?: { summary?: string } | null;
  kbMatch?: { entryId?: string; symptom?: string } | null;
  quickReplies?: unknown;
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

function buildKbMatch(
  raw: ParsedAgentPayload["kbMatch"],
  knowledgeBase: KnowledgeEntry[]
): KbMatchPreview | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const entryId = String(raw.entryId ?? "").trim();
  const symptom = String(raw.symptom ?? "").trim();
  if (!entryId) return undefined;
  const entry = knowledgeBase.find((e) => e.id === entryId);
  return {
    entryId,
    symptom: symptom || entry?.symptom || "Problema risolto in precedenza",
    frequency: entry?.frequency,
  };
}

const KB_SEARCH_INTRO =
  "Un attimo, verifico nella knowledge base se questo problema è già stato risolto in passato…";

function ensureKbSearchIntro(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("knowledge base") ||
    lower.includes("verifico nella") ||
    lower.includes("cerco nella")
  ) {
    return message;
  }
  return `${KB_SEARCH_INTRO}\n\n${message}`;
}

function stripKbSearchIntro(message: string): string {
  return message
    .replace(
      /^un attimo,?\s*verifico nella knowledge base[^\n]*\n*/i,
      ""
    )
    .replace(/^attendi,?\s*cerco nella knowledge base[^\n]*\n*/i, "")
    .trim();
}

function coerceAttachments(raw: unknown): ChatAttachmentPayload[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: ChatAttachmentPayload[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    const mimeType = String(o.mimeType ?? "").trim();
    const size = Number(o.size);
    const kind = o.kind === "image" ? "image" : "document";
    if (!name || !mimeType || Number.isNaN(size)) continue;
    const att: ChatAttachmentPayload = { name, mimeType, size, kind };
    if (kind === "image" && typeof o.dataBase64 === "string" && o.dataBase64) {
      att.dataBase64 = o.dataBase64;
    }
    out.push(att);
  }
  return out.length > 0 ? out : undefined;
}

function toImageMediaType(mime: string): AnthropicImageMediaType | null {
  if (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/gif" ||
    mime === "image/webp"
  ) {
    return mime;
  }
  return null;
}

function buildAnthropicTurns(messages: ChatMessage[]): AnthropicChatTurn[] {
  return messages.map((msg) => {
    if (msg.role === "assistant") {
      return { role: "assistant", content: msg.content };
    }

    const attachments = msg.attachments ?? [];
    const images = attachments.filter(
      (a) => a.kind === "image" && a.dataBase64
    );
    const documents = attachments.filter((a) => a.kind === "document");

    let text = msg.content.trim();
    if (!text && (images.length > 0 || documents.length > 0)) {
      text = "L'utente ha inviato allegati.";
    }
    if (documents.length > 0) {
      const docLines = documents.map(documentAttachmentNote).join("\n");
      text = text ? `${text}\n\n${docLines}` : docLines;
    }

    if (images.length === 0) {
      return { role: "user", content: text };
    }

    const blocks: AnthropicContentBlock[] = [];
    for (const img of images) {
      const media = toImageMediaType(img.mimeType);
      if (!media || !img.dataBase64) continue;
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: media,
          data: img.dataBase64,
        },
      });
    }
    blocks.push({ type: "text", text });
    return { role: "user", content: blocks };
  });
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
    const attachments = coerceAttachments(
      (m as { attachments?: unknown }).attachments
    );
    if (role !== "user" && role !== "assistant") continue;
    if (!content && !attachments?.length) continue;
    result.push({ role, content, attachments });
  }
  return result.length > 0 ? result : null;
}

function coerceKnowledgeBase(body: unknown): KnowledgeEntry[] {
  if (!body || typeof body !== "object") return [];
  const kb = (body as { knowledgeBase?: unknown }).knowledgeBase;
  if (!Array.isArray(kb)) return [];
  return kb.filter(
    (e): e is KnowledgeEntry =>
      !!e &&
      typeof e === "object" &&
      typeof (e as KnowledgeEntry).id === "string" &&
      typeof (e as KnowledgeEntry).symptom === "string"
  );
}

export async function POST(req: Request) {
  let messages: ChatMessage[] | null = null;
  let knowledgeBase: KnowledgeEntry[] = [];
  try {
    const body = await req.json();
    messages = coerceMessages(body);
    knowledgeBase = coerceKnowledgeBase(body);
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

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const recentContext = messages
    .slice(-6)
    .map((m) => m.content)
    .join(" ");
  const ticketEscalation = lastUser
    ? isTicketEscalationIntent(messages, lastUser.content)
    : false;
  const readyForKb =
    lastUser && !ticketEscalation
      ? isReadyForKbSearch(messages, lastUser.content)
      : false;
  const candidates =
    readyForKb && lastUser
      ? findKbCandidates(knowledgeBase, lastUser.content, recentContext)
      : [];
  const kbSearchBlock = ticketEscalation
    ? formatTicketEscalationBlock()
    : formatKbCandidatesForPrompt(candidates, readyForKb);
  const troubleshootingTurn = readyForKb;

  const systemPrompt = buildSystemPrompt(knowledgeBase, kbSearchBlock);

  try {
    const llm = await callAnthropicConversation({
      system: systemPrompt,
      messages: buildAnthropicTurns(messages),
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

    let kbMatch = buildKbMatch(parsed.kbMatch, knowledgeBase);
    if (!readyForKb || ticketEscalation) {
      kbMatch = undefined;
    } else if (!kbMatch && candidates.length > 0 && !parsed.ticket) {
      const top = candidates[0];
      kbMatch = {
        entryId: top.id,
        symptom: top.symptom.slice(0, 100),
        frequency: top.frequency,
      };
    }
    let ticket = kbMatch ? undefined : buildTicket(parsed.ticket);
    if (ticketEscalation && !ticket && lastUser) {
      const summary = lastUser.content
        .replace(/^(apri(re)?|crea(re)?)\s+(un\s+)?ticket\s*/i, "")
        .trim();
      ticket = buildTicket({
        summary: summary || lastUser.content.slice(0, 120),
      });
    }

    let message = parsed.message.trim();
    if (troubleshootingTurn) {
      message = ensureKbSearchIntro(message);
    }
    if (ticketEscalation) {
      message = stripKbSearchIntro(message);
    }

    const response: ServiceChatResponse = {
      message,
      spareParts: normalizeSpareParts(parsed.spareParts),
      ticket,
      kbMatch,
      kbSearching: troubleshootingTurn,
      quickReplies: normalizeApiQuickReplies(parsed.quickReplies),
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
