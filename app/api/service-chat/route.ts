import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
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
  isReadyForKbSearch,
} from "@/lib/knowledgeSearch";
import { buildMachinesContext } from "@/lib/serviceChatData";
import {
  anonymousServiceChatContext,
  clampConfidence,
  filterPartsByVisualQuery,
  loadServiceChatCompanyContext,
  mergeSparePartConfidence,
  serializeChatPark,
  type ServiceChatCompanyContext,
} from "@/lib/serviceChatCompanyContext";
import { buildServiceChatFallback } from "@/lib/serviceChatFallback";
import { documentAttachmentNote } from "@/lib/serviceChatAttachments";
import { normalizeApiQuickReplies, ensureMachineOtherOption } from "@/lib/serviceChatQuickReplies";
import type { KnowledgeEntry } from "@/lib/knowledgeTypes";
import type {
  ChatAttachmentPayload,
  ChatMessage,
  KbMatchPreview,
  ServiceChatResponse,
  SparePartProposal,
} from "@/lib/serviceChatTypes";

// =============================================================
// POST /api/service-chat
// Agente assistenza after-sales — KB dinamica dal client a ogni richiesta.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildSystemPrompt(
  knowledgeBase: KnowledgeEntry[],
  kbSearchBlock: string,
  locale: "it" | "en" = "it",
  company: ServiceChatCompanyContext
): string {
  const kbContext = formatKnowledgeForPrompt(knowledgeBase);
  const machinesContext = buildMachinesContext(company.machines);
  const lang = locale === "en" ? "English" : "Italian";
  const langIt = locale === "en" ? "inglese" : "italiano";
  const hasPark = company.machines.length > 0;
  return `Sei l'agente di assistenza service after-sales di "aftercore".
Parli in ${langIt} (${lang}), tono professionale e chiaro, come un tecnico esperto ma accessibile.
Lavori SOLO per la company indicata nel contesto. Non mescolare cataloghi o parchi di altre aziende.

## COMPANY E CATALOGO (fonte primaria ricambi)
${company.catalogBlock}

## FLUSSO OBBLIGATORIO
1. **Capisci il bisogno**: distingui RICAMBIO vs MALFUNZIONAMENTO.
2. **Ramo ricambi**: cerca il pezzo nel CATALOGO RICAMBI CARICATO (codice, OEM, descrizione, foto). Non aspettare la matricola se la foto/descrizione basta a trovare candidati.
3. **Macchina**: ${
    hasPark
      ? "puoi proporre quickReplies SOLO con le macchine del parco di questa company."
      : "questa company NON ha parco macchine. VIETATO chiedere matricola/modello. VIETATO elencare impianti (VLM-2200 o altri). Cerca SUBITO nel catalogo dalla foto/descrizione e proponi i match in spareParts. quickReplies=null o opzioni sul ricambio, mai matricole."
  }

## OPZIONE "ALTRO"
Se l'utente sceglie "Altro — preferisco descrivere liberamente" (bubble iniziali):
- Invitalo a descrivere liberamente la richiesta (ricambio, guasto o altro).
- ${hasPark ? "Suggerisci modello/matricola come opzione utile, con quickReplies delle macchine disponibili." : "Non chiedere la macchina e non mostrare matricole."}
- NON bloccare la conversazione. Rispondi SEMPRE con JSON valido e "message" non vuoto.

Se l'utente sceglie "La macchina non è in elenco — indico modello o matricola" (bubble selezione macchina):
- Invitalo a scrivere modello/matricola nel testo libero o ad allegare foto della targhetta.
- NON ripetere l'elenco macchine. quickReplies=null finché non fornisce i dati.

## FLUSSO TROUBLESHOOTING — ORDINE RIGIDO (non saltare passi)
**Fase A** — Utente segnala malfunzionamento senza macchina:
- ${hasPark ? "Chiedi matricola/modello. quickReplies con le macchine disponibili più opzione \"Altro\" (macchina non in elenco)." : "NON chiedere la macchina. Chiedi sintomi/foto e cerca nel catalogo o in KB solo dopo aver capito il pezzo/problema."}
- NON cercare nella KB. kbMatch=null. NON proporre soluzioni.

**Fase B** — Utente indica SOLO la macchina (es. "Matricola MX-4521 — Rettificatrice RX-400"):
- Conferma brevemente la macchina identificata.
- Chiedi esplicitamente di **descrivere il guasto**: sintomi, comportamento anomalo, messaggi di errore, quando si manifesta.
- Proponi quickReplies con sintomi tipici. NON cercare nella KB. kbMatch=null. NON proporre soluzioni.

**Fase C** — Utente descrive il guasto (macchina già nota):
- SOLO ORA avvia la ricerca KB. La risposta DEVE iniziare con: "Un attimo, verifico nella knowledge base se questo problema è già stato risolto in passato…"
- Se trovi corrispondenza: spiega causa + soluzione + ricambi. Cita scheda [ID] nel Manuale. Imposta kbMatch.
- Se NON trovi: dopo la frase iniziale, dichiara che la KB non contiene il caso e invita l'utente ad aggiungere dettagli. Un operatore seguirà la conversazione.

## REGOLA PRIORITARIA — KNOWLEDGE BASE
- La KB è la prima fonte per i malfunzionamenti: cerca SEMPRE prima di escalare.
- Se trovi un caso simile (stesso sintomo/macchina): proponi la soluzione appresa da interventi precedenti.
- Imposta "kbMatch" con l'id esatto della voce (es. "KB-101") e un breve sintomo.
- Nel "message" includi sempre la referenza alla scheda KB quando usi una voce.

## ALLEGATI
- Analizza le FOTO per identificare il componente (forma, codice, brand) e cerca match nel catalogo.
- Per DOCUMENTI non visualizzabili usa il nome file e invita l'utente ad aggiungere contesto.

## REGOLA CRITICA — MAI INVENTARE
- Se il pezzo NON è nel catalogo di questa company, o il problema NON ha casi simili nella KB: NON inventare.
- Vietato citare Vallmec, VLM-2200 o matricole demo.
- Se la company non ha parco macchine: NON chiedere su quale macchina è montato il pezzo.
- Invita l'utente a fornire più dettagli: la conversazione resta aperta e un operatore può intervenire.

## VINCOLI
Ragiona ESCLUSIVAMENTE sui dati nel contesto. Non usare conoscenza esterna.

## FORMATO RISPOSTA
Rispondi ESCLUSIVAMENTE con JSON valido (senza markdown):
{
  "message": "testo per l'utente in ${langIt}",
  "spareParts": null oppure [{"code":"...","description":"...","price":123.45,"availability":"disponibile"|"da_ordinare","leadTimeDays":0,"confidence":85}],
  "kbMatch": null oppure {"entryId":"KB-101","symptom":"breve sintomo della voce usata"},
  "quickReplies": null oppure [{"label":"...","value":"..."}]
}

Regole JSON:
- "message" sempre obbligatorio.
- "kbMatch": SOLO quando risolvi usando la KB.
- "quickReplies": 2-5 opzioni quando chiedi scelte; sintomi dalla KB se troubleshooting.
- "spareParts": SOLO voci del catalogo il cui TIPO coincide con la foto/descrizione (codice reale). Se in foto c'è una ruota dentata/ingranaggio NON proporre regolatori, filtri, valvole o altri pezzi diversi. Se manca il prezzo usa 0. "confidence" è 0-100. Se non c'è un match credibile: spareParts=null. Meglio zero risultati che risultati sbagliati. La lista "voci più pertinenti" è solo un ranking testuale: ignorala se non combacia con la foto.

## DATI DI CONTESTO (unica fonte di verità)
${machinesContext}

${kbContext}

${kbSearchBlock}`;
}

interface ParsedAgentPayload {
  message?: string;
  spareParts?: SparePartProposal[] | null;
  kbMatch?: { entryId?: string; symptom?: string } | null;
  quickReplies?: unknown;
}

function parseAgentJson(text: string): ParsedAgentPayload | null {
  const trimmed = text.trim();
  const candidates = [
    trimmed,
    trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim(),
  ];

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ParsedAgentPayload;
      if (parsed?.message?.trim()) return parsed;
    } catch {
      // Prova estrazione del blocco JSON.
    }
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as ParsedAgentPayload;
      if (parsed?.message?.trim()) return parsed;
    } catch {
      // Continua con fallback testuale.
    }
  }

  const messageMatch = trimmed.match(
    /"message"\s*:\s*"((?:\\.|[^"\\])*)"/
  );
  if (messageMatch) {
    try {
      return {
        message: JSON.parse(`"${messageMatch[1]}"`) as string,
      };
    } catch {
      return { message: messageMatch[1].replace(/\\n/g, "\n") };
    }
  }

  if (trimmed && !trimmed.startsWith("{")) {
    return { message: trimmed };
  }

  return null;
}

function normalizeSpareParts(raw: unknown): SparePartProposal[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const parts: SparePartProposal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const p = item as Record<string, unknown>;
    const code = String(p.code ?? "").trim();
    const description = String(p.description ?? "").trim();
    const rawPrice = p.price;
    const price =
      rawPrice == null || rawPrice === "" ? 0 : Number(rawPrice);
    const availability =
      p.availability === "da_ordinare" ? "da_ordinare" : "disponibile";
    if (!code || !description || Number.isNaN(price)) continue;
    const confidence = clampConfidence(
      p.confidence ?? p.confidenza ?? p.score
    );
    const opt = (v: unknown) => {
      const s = String(v ?? "").trim();
      return s || undefined;
    };
    parts.push({
      code,
      description,
      price,
      availability,
      leadTimeDays:
        typeof p.leadTimeDays === "number" ? p.leadTimeDays : undefined,
      confidence,
      oemCode: opt(p.oemCode ?? p.codiceOEM),
      name: opt(p.name ?? p.nome),
      brand: opt(p.brand),
      manufacturer: opt(p.manufacturer ?? p.produttore),
      supplier: opt(p.supplier ?? p.fornitore),
      category: opt(p.category ?? p.categoria),
      unit: opt(p.unit ?? p.um),
      compatibleMachine: opt(
        p.compatibleMachine ?? p.macchinaCompatibile
      ),
    });
  }
  return parts.length > 0 ? parts : undefined;
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

function coerceLocale(body: unknown): "it" | "en" {
  if (!body || typeof body !== "object") return "it";
  const locale = (body as { locale?: unknown }).locale;
  return locale === "en" ? "en" : "it";
}

export async function POST(req: Request) {
  let messages: ChatMessage[] | null = null;
  let knowledgeBase: KnowledgeEntry[] = [];
  let locale: "it" | "en" = "it";
  try {
    const body = await req.json();
    messages = coerceMessages(body);
    knowledgeBase = coerceKnowledgeBase(body);
    locale = coerceLocale(body);
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

  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userQuery = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .filter(Boolean)
    .join(" ");

  let company = anonymousServiceChatContext();
  try {
    const me = await getCurrentUser();
    if (me) {
      company = await loadServiceChatCompanyContext(
        me.companyId,
        me.company.name,
        me.company.slug,
        userQuery
      );
    }
  } catch (err) {
    console.error("Service chat company context:", err);
  }

  const machines = company.machines;
  const park = serializeChatPark(machines);

  const withPark = (
    payload: ServiceChatResponse
  ): ServiceChatResponse => {
    const next = { ...payload, machines: park };
    if (next.spareParts?.length) {
      next.spareParts = mergeSparePartConfidence(
        next.spareParts,
        company.catalogHits
      );
    }
    if (machines.length === 0) {
      next.quickReplies = ensureMachineOtherOption(next.quickReplies, []);
    }
    return next;
  };

  const apiKey = getAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      withPark(buildServiceChatFallback(messages, knowledgeBase, machines))
    );
  }

  const recentContext = messages
    .slice(-6)
    .map((m) => m.content)
    .join(" ");
  const readyForKb = lastUser
    ? isReadyForKbSearch(messages, lastUser.content, machines)
    : false;
  const candidates =
    readyForKb && lastUser
      ? findKbCandidates(knowledgeBase, lastUser.content, recentContext)
      : [];
  const kbSearchBlock = formatKbCandidatesForPrompt(candidates, readyForKb);
  const troubleshootingTurn = readyForKb;

  const systemPrompt = buildSystemPrompt(
    knowledgeBase,
    kbSearchBlock,
    locale,
    company
  );

  try {
    const llm = await callAnthropicConversation({
      system: systemPrompt,
      messages: buildAnthropicTurns(messages),
      maxTokens: 1536,
    });

    if (!llm.ok) {
      console.error("Service chat Anthropic fallback:", llm.message);
      return NextResponse.json(
        withPark(buildServiceChatFallback(messages, knowledgeBase, machines))
      );
    }

    const parsed = parseAgentJson(llm.text);
    if (!parsed?.message?.trim()) {
      console.error(
        "Service chat JSON parse fallback — raw:",
        llm.text.slice(0, 500)
      );
      return NextResponse.json(
        withPark(buildServiceChatFallback(messages, knowledgeBase, machines))
      );
    }

    let kbMatch = buildKbMatch(parsed.kbMatch, knowledgeBase);
    if (!readyForKb) {
      kbMatch = undefined;
    } else if (!kbMatch && candidates.length > 0) {
      const top = candidates[0];
      kbMatch = {
        entryId: top.id,
        symptom: top.symptom.slice(0, 100),
        frequency: top.frequency,
      };
    }

    let message = parsed.message.trim();
    if (troubleshootingTurn) {
      message = ensureKbSearchIntro(message);
    }

    let spareParts = normalizeSpareParts(parsed.spareParts);
    const visualQuery = [lastUser?.content ?? "", message]
      .filter(Boolean)
      .join(" ");
    const refinedHits = company.rankCatalog(visualQuery);
    if (spareParts?.length) {
      const filtered = filterPartsByVisualQuery(spareParts, visualQuery);
      spareParts = filtered.length > 0 ? filtered : undefined;
    }
    if (!spareParts?.length) {
      const strong = refinedHits.filter((h) => (h.confidence ?? 0) >= 50);
      spareParts = strong.length > 0 ? strong.slice(0, 4) : undefined;
    }
    const quickReplies = ensureMachineOtherOption(
      normalizeApiQuickReplies(parsed.quickReplies),
      machines
    );

    if (machines.length === 0) {
      if (/matricola|vlm-?\s*2200|quale macchina|parco macchine/i.test(message)) {
        message = spareParts?.length
          ? "Ho cercato nel catalogo ricambi a partire da foto e descrizione. Ecco i match più vicini: verifica codice e descrizione, oppure indicami marca o codice visibile sul pezzo."
          : "In questa company non c'è un parco macchine: cerco nel catalogo ricambi. Inviami codice, marca o una foto più nitida del pezzo.";
      }
    }

    if (spareParts?.length) {
      spareParts = mergeSparePartConfidence(spareParts, refinedHits);
    }

    const response: ServiceChatResponse = {
      message,
      spareParts,
      kbMatch,
      kbSearching: troubleshootingTurn,
      quickReplies,
      source: "anthropic",
      machines: park,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Service chat route error:", err);
    return NextResponse.json(
      withPark(buildServiceChatFallback(messages, knowledgeBase, machines))
    );
  }
}
