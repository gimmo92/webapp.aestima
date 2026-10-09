import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { callAnthropicConversation } from "@/lib/anthropicKey";
import { loadCompanyManuals } from "@/lib/companyManuals";
import { bestManualHit, formatManualsForPrompt } from "@/lib/manualText";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Turn = { role: "user" | "assistant"; content: string };

function lastUserText(messages: Turn[]): string {
  return (
    [...messages].reverse().find((message) => message.role === "user")?.content ??
    ""
  );
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
  const raw = Array.isArray(body?.messages) ? body.messages : [];
  const messages: Turn[] = raw
    .filter((item): item is { role?: unknown; content?: unknown } =>
      Boolean(item) && typeof item === "object"
    )
    .map((item) => ({
      role: item.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: String(item.content ?? "").trim().slice(0, 4000),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-12);

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

  const query = lastUserText(messages);
  const lang = locale === "en" ? "English" : "italiano";
  const system = `Sei l'assistente di montaggio per gli installatori di ${me.company.name}.
Rispondi solo usando i manuali nel contesto. Lingua: ${lang}. Frasi corte, passi numerati nell'ordine del manuale.
Cita sempre il nome del file. Se il testo non contiene la risposta, dillo chiaramente e non inventare coppie, sequenze, misure o quote.
Non identificare ricambi e non proporre codici che non compaiono nel testo.

${formatManualsForPrompt(usable, query)}`;

  const result = await callAnthropicConversation({
    system,
    messages,
    maxTokens: 900,
  });

  const hit = bestManualHit(usable, query);
  const source = hit && hit.score > 0 ? hit.name : null;

  if (result.ok) {
    return NextResponse.json({ message: result.text.trim(), source });
  }

  if (hit && hit.score >= 1) {
    const message =
      locale === "en"
        ? `From the manual “${hit.name}”:\n\n${hit.excerpt}`
        : `Nel manuale «${hit.name}» ho trovato questo passaggio:\n\n${hit.excerpt}`;
    return NextResponse.json({ message, source: hit.name });
  }

  return NextResponse.json({ code: "unavailable" });
}
