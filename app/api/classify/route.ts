import { NextResponse } from "next/server";
import { SOURCE_FILES } from "@/lib/archiveData";
import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";
import type { ClassifyResult, DocType } from "@/lib/archiveTypes";

// =============================================================
// POST /api/classify
// -------------------------------------------------------------
// Classifica i file dell'archivio (tipo di documento).
//
// - Se ANTHROPIC_API_KEY è impostata → chiede a Claude di classificare
//   il TIPO di ogni file da nome + anteprima e restituisce il JSON.
// - Se la chiave NON c'è (o la chiamata fallisce) → fallback alla
//   classificazione mock predefinita (ground truth in archiveData).
//
// Nota: macchina, codice, revisione e confidenza restano dai dati
// interni (un LLM non li dedurrebbe da un nome file); Claude guida
// il TIPO. Così la demo resta coerente e l'archivio stabile.
//
// La chiave NON è mai hardcodata: va impostata come env var.
// =============================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOC_TYPES: DocType[] = [
  "disegno",
  "distinta",
  "catalogo",
  "offerta",
  "manuale",
  "foto",
];

const SYSTEM_PROMPT = `Sei l'agente di organizzazione documentale di "aestima" per il settore ricambi industriali after-sales.
Ricevi un elenco di file (nome + breve anteprima del contenuto) e devi classificare il TIPO di ciascun documento.

Tipi ammessi (usa esattamente queste stringhe): "disegno", "distinta", "catalogo", "offerta", "manuale", "foto".
- disegno: disegni tecnici, schemi, file CAD
- distinta: distinte base / elenchi componenti (BOM)
- catalogo: cataloghi ricambi
- offerta: preventivi / offerte a clienti
- manuale: manuali d'uso e manutenzione
- foto: fotografie di componenti

Rispondi ESCLUSIVAMENTE con un array JSON valido, senza testo aggiuntivo, senza markdown.
Schema: [{"id": string, "tipo": "disegno"|"distinta"|"catalogo"|"offerta"|"manuale"|"foto"}]`;

/** Costruisce il risultato mock (ground truth) per un file. */
function mockResult(id: string): ClassifyResult | null {
  const f = SOURCE_FILES.find((x) => x.id === id);
  if (!f) return null;
  const c = f.classification;
  return {
    id: f.id,
    tipo: c.tipo,
    macchinaSerial: c.macchinaSerial,
    codice: c.codice,
    revisione: c.revisione,
    data: c.data,
    confidence: c.confidence,
    source: "mock",
  };
}

function parseJsonArray(text: string): Array<{ id: string; tipo: string }> | null {
  try {
    const direct = JSON.parse(text);
    if (Array.isArray(direct)) return direct;
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr)) return arr;
      } catch {
        return null;
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  // Opzionale: sottoinsieme di file. Default: tutti.
  let ids: string[] = SOURCE_FILES.map((f) => f.id);
  try {
    const body = await req.json();
    if (Array.isArray(body?.fileIds) && body.fileIds.length > 0) {
      ids = body.fileIds.filter((x: unknown) => typeof x === "string");
    }
  } catch {
    // corpo assente/non valido → usa tutti i file
  }

  const files = SOURCE_FILES.filter((f) => ids.includes(f.id));
  const apiKey = getAnthropicKey();

  // Nessuna chiave → classificazione mock.
  if (!apiKey) {
    const results = files
      .map((f) => mockResult(f.id))
      .filter((r): r is ClassifyResult => r !== null);
    return NextResponse.json({ results, source: "mock" });
  }

  try {
    const userContent = files
      .map((f) => `id: ${f.id}\nnome: ${f.name}\nanteprima: ${f.preview}`)
      .join("\n---\n");

    const llm = await callAnthropicMessages({
      system: SYSTEM_PROMPT,
      user: userContent,
    });

    if (!llm.ok) {
      console.error("Classify Anthropic fallback:", llm.message);
      const results = files
        .map((f) => mockResult(f.id))
        .filter((r): r is ClassifyResult => r !== null);
      return NextResponse.json({ results, source: "mock" });
    }

    const parsed = parseJsonArray(llm.text);
    const tipoById = new Map<string, string>(
      (parsed ?? []).map((p) => [String(p.id), String(p.tipo)])
    );

    // Unisce il TIPO da Claude con i metadati interni (mock).
    const results: ClassifyResult[] = files.flatMap((f) => {
      const base = mockResult(f.id);
      if (!base) return [];
      const claudeTipo = tipoById.get(f.id);
      const tipo = (DOC_TYPES.includes(claudeTipo as DocType)
        ? claudeTipo
        : base.tipo) as DocType;
      return [{ ...base, tipo, source: "anthropic" }];
    });

    return NextResponse.json({ results, source: "anthropic" });
  } catch (err) {
    console.error("Classify route error:", err);
    const results = files
      .map((f) => mockResult(f.id))
      .filter((r): r is ClassifyResult => r !== null);
    return NextResponse.json({ results, source: "mock" });
  }
}
