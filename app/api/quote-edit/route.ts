import { NextResponse } from "next/server";
import { recomputeTotals } from "@/lib/quote";
import { mockQuoteEdit } from "@/lib/mockQuoteEdit";
import { ANTHROPIC_MODEL, getAnthropicKey } from "@/lib/anthropicKey";
import type { Quote, QuoteLine } from "@/lib/types";

// =============================================================
// POST /api/quote-edit
// -------------------------------------------------------------
// Modifica un preventivo in base a un'istruzione in linguaggio
// naturale scritta dall'operatore (es. "applica 10% di sconto",
// "aggiungi una riga di trasporto da 50€", "quantità 2").
//
// - Se la API key Anthropic è impostata → Claude restituisce i campi
//   EDITABILI aggiornati (righe, note, % urgenza). I totali li
//   ricalcoliamo noi lato server per evitare errori aritmetici.
// - Se la chiave NON c'è (o la chiamata fallisce) → fallback euristico
//   locale, così la demo funziona comunque.
//
// La chiave NON è mai hardcodata: va impostata come env var su Vercel
// (ANTHROPIC_API_KEY oppure "anthropic").
// =============================================================

export const runtime = "nodejs";

const MODEL = ANTHROPIC_MODEL;

const SYSTEM_PROMPT = `Sei l'agente di "aestima" che aiuta un tecnico a modificare un PREVENTIVO di ricambi industriali.
Ricevi il preventivo attuale in JSON e un'istruzione in italiano dell'operatore.
Applica l'istruzione e restituisci SOLO i campi editabili aggiornati.

Regole:
- NON calcolare i totali (subtotal, iva, total): li ricalcola il sistema. Restituisci solo righe, note e percentuali.
- Mantieni la valuta in EUR come numeri (niente simboli).
- Ogni riga ha: code (stringa), description (stringa), qty (numero), unitPrice (numero, prezzo unitario IVA esclusa).
- Puoi aggiungere, rimuovere o modificare righe, cambiare quantità/prezzi, applicare sconti (modificando gli unitPrice o aggiungendo una riga sconto negativa), aggiornare le note.
- urgencySurchargePct è la percentuale di maggiorazione per urgenza (0 se non applicabile).
- vatPct è l'aliquota IVA (di norma 22): non cambiarla se non richiesto.
- Se l'istruzione non è chiara, applica la modifica più ragionevole senza stravolgere il preventivo.

Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza testo aggiuntivo, senza markdown, senza backtick.
Schema: {"customerName": string, "notes": string, "urgencySurchargePct": number, "vatPct": number, "lines": [{"code": string, "description": string, "qty": number, "unitPrice": number}]}`;

function parseJson(text: string): Record<string, unknown> | null {
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

/** Normalizza le righe ricevute dall'LLM in QuoteLine valide. */
function coerceLines(raw: unknown, fallback: QuoteLine[]): QuoteLine[] {
  if (!Array.isArray(raw)) return fallback;
  const lines = raw
    .map((r): QuoteLine | null => {
      if (typeof r !== "object" || r === null) return null;
      const o = r as Record<string, unknown>;
      const qty = Number(o.qty);
      const unitPrice = Number(o.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(unitPrice)) return null;
      return {
        code: String(o.code ?? "").trim() || "—",
        description: String(o.description ?? "").trim() || "Voce",
        qty,
        unitPrice,
        total: qty * unitPrice,
      };
    })
    .filter((l): l is QuoteLine => l !== null);
  return lines.length > 0 ? lines : fallback;
}

export async function POST(req: Request) {
  let quote: Quote | null = null;
  let instruction = "";
  try {
    const body = await req.json();
    quote = body?.quote ?? null;
    instruction = typeof body?.instruction === "string" ? body.instruction : "";
  } catch {
    return NextResponse.json(
      { error: "Corpo della richiesta non valido." },
      { status: 400 }
    );
  }

  if (!quote || !Array.isArray(quote.lines)) {
    return NextResponse.json(
      { error: "Preventivo mancante o non valido." },
      { status: 400 }
    );
  }
  if (!instruction.trim()) {
    return NextResponse.json(
      { error: "L'istruzione di modifica è vuota." },
      { status: 400 }
    );
  }

  const apiKey = getAnthropicKey();

  // Nessuna chiave → fallback euristico locale.
  if (!apiKey) {
    return NextResponse.json({
      quote: mockQuoteEdit(quote, instruction),
      source: "mock",
    });
  }

  try {
    const userContent = `PREVENTIVO ATTUALE (JSON):
${JSON.stringify(
  {
    customerName: quote.customerName,
    notes: quote.notes,
    urgencySurchargePct: quote.urgencySurchargePct,
    vatPct: quote.vatPct,
    lines: quote.lines.map((l) => ({
      code: l.code,
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
    })),
  },
  null,
  2
)}

ISTRUZIONE DELL'OPERATORE:
${instruction}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic quote-edit error:", res.status, await res.text());
      return NextResponse.json({
        quote: mockQuoteEdit(quote, instruction),
        source: "mock",
      });
    }

    const data = await res.json();
    const text: string =
      data?.content?.map((c: { text?: string }) => c.text ?? "").join("") ?? "";
    const parsed = parseJson(text);
    if (!parsed) {
      return NextResponse.json({
        quote: mockQuoteEdit(quote, instruction),
        source: "mock",
      });
    }

    const lines = coerceLines(parsed.lines, quote.lines);
    const urgencySurchargePct = Number.isFinite(Number(parsed.urgencySurchargePct))
      ? Number(parsed.urgencySurchargePct)
      : quote.urgencySurchargePct;
    const vatPct = Number.isFinite(Number(parsed.vatPct))
      ? Number(parsed.vatPct)
      : quote.vatPct;

    const totals = recomputeTotals(lines, urgencySurchargePct, vatPct);

    const updated: Quote = {
      ...quote,
      customerName: String(parsed.customerName ?? quote.customerName),
      notes: String(parsed.notes ?? quote.notes),
      urgencySurchargePct,
      vatPct,
      ...totals,
    };

    return NextResponse.json({ quote: updated, source: "anthropic" });
  } catch (err) {
    console.error("Quote-edit route error:", err);
    return NextResponse.json({
      quote: mockQuoteEdit(quote, instruction),
      source: "mock",
    });
  }
}
