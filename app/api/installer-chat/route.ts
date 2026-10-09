import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  callAnthropicConversation,
  type AnthropicChatTurn,
  type AnthropicContentBlock,
  type AnthropicImageMediaType,
} from "@/lib/anthropicKey";
import { loadCompanyManuals } from "@/lib/companyManuals";
import { manualHits, formatManualsForPrompt } from "@/lib/manualText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set<AnthropicImageMediaType>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

type ImageIn = { mimeType: AnthropicImageMediaType; dataBase64: string };

type Turn = {
  role: "user" | "assistant";
  content: string;
  images: ImageIn[];
};

function imageMedia(mime: string): AnthropicImageMediaType | null {
  return IMAGE_TYPES.has(mime as AnthropicImageMediaType)
    ? (mime as AnthropicImageMediaType)
    : null;
}

function readImages(raw: unknown): ImageIn[] {
  if (!Array.isArray(raw)) return [];
  const images: ImageIn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || images.length >= 4) continue;
    const row = item as Record<string, unknown>;
    const mime = imageMedia(String(row.mimeType ?? ""));
    const data = typeof row.dataBase64 === "string" ? row.dataBase64 : "";
    if (!mime || data.length < 32 || data.length > 6_000_000) continue;
    images.push({ mimeType: mime, dataBase64: data });
  }
  return images;
}

function readMessages(raw: unknown): Turn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object"
    )
    .map((item) => ({
      role:
        item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(item.content ?? "").trim().slice(0, 4000),
      images: item.role === "assistant" ? [] : readImages(item.images),
    }))
    .filter((item) => item.content.length > 0 || item.images.length > 0)
    .slice(-12);
}

function toAnthropic(messages: Turn[]): AnthropicChatTurn[] {
  return messages.map((message) => {
    if (message.role === "assistant" || message.images.length === 0) {
      return {
        role: message.role,
        content: message.content || "Foto allegata.",
      };
    }
    const blocks: AnthropicContentBlock[] = message.images.map((image) => ({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mimeType,
        data: image.dataBase64,
      },
    }));
    blocks.push({
      type: "text",
      text: message.content || "Guarda la foto e rispondi dal manuale.",
    });
    return { role: "user", content: blocks };
  });
}

export async function POST(request: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ code: "auth" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    messages?: unknown;
    locale?: unknown;
  } | null;
  const locale = body?.locale === "en" ? "en" : "it";
  const messages = readMessages(body?.messages);
  if (!messages.some((item) => item.role === "user")) {
    return NextResponse.json({ code: "empty" }, { status: 400 });
  }

  const manuals = await loadCompanyManuals(me.companyId);
  const usable = manuals.filter(
    (manual) => manual.textExtracted && manual.extractedText.trim()
  );
  if (usable.length === 0) {
    return NextResponse.json({
      code: manuals.length === 0 ? "noManuals" : "noText",
    });
  }

  const query =
    [...messages].reverse().find((message) => message.role === "user")
      ?.content ?? "";
  const sources = manualHits(usable, query).map(({ name, excerpt }) => ({
    name,
    excerpt,
  }));
  const lang = locale === "en" ? "English" : "italiano";
  const system = `Sei l'assistente di montaggio per gli installatori di ${me.company.name}.
Rispondi solo usando i manuali nel contesto. Lingua: ${lang}. Frasi corte, passi numerati nell'ordine del manuale.
Cita sempre il nome del file. Se il testo non contiene la risposta, dillo chiaramente e non inventare coppie, sequenze, misure o quote.
Una foto allegata serve a capire il pezzo o il passaggio: la procedura resta quella scritta nel manuale.
Non identificare ricambi e non proporre codici che non compaiono nel testo.

${formatManualsForPrompt(usable, query)}`;

  const result = await callAnthropicConversation({
    system,
    messages: toAnthropic(messages),
    maxTokens: 900,
  });

  if (result.ok) {
    return NextResponse.json({ message: result.text.trim(), sources });
  }

  const hit = sources[0];
  if (hit) {
    const message =
      locale === "en"
        ? `From the manual “${hit.name}”:\n\n${hit.excerpt}`
        : `Nel manuale «${hit.name}» ho trovato questo passaggio:\n\n${hit.excerpt}`;
    return NextResponse.json({ message, sources });
  }

  return NextResponse.json({ code: "unavailable" });
}
