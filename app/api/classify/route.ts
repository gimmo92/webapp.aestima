import { NextResponse } from "next/server";
import { SOURCE_FILES } from "@/lib/archiveData";
import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";
import { inferClassificationFromName } from "@/lib/classifyHeuristics";
import type { ClassifyResult, DocType, FileExt } from "@/lib/archiveTypes";

// =============================================================
// POST /api/classify
// -------------------------------------------------------------
// Classifica i file dell'archivio (tipo di documento).
//
// Accetta:
//  - { fileIds?: string[] } → solo file in SOURCE_FILES (legacy demo)
//  - { files?: { id, name, preview, ext? }[] } → upload operatore
//
// - Se ANTHROPIC_API_KEY è impostata → Claude classifica il TIPO;
//   macchina/revisione/confidenza restano da euristica o ground truth.
// - Senza chiave → mock / euristica da nome file.
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

type IncomingFile = {
  id: string;
  name: string;
  preview: string;
  ext?: string;
};

function parseExt(name: string, explicit?: string): FileExt {
  if (explicit && ["pdf", "xlsx", "jpg", "png", "dwg", "docx"].includes(explicit)) {
    return explicit as FileExt;
  }
  const match = name.match(/\.([a-z0-9]+)$/i);
  const ext = (match?.[1] ?? "pdf").toLowerCase();
  if (["pdf", "xlsx", "jpg", "png", "dwg", "docx"].includes(ext)) {
    return ext as FileExt;
  }
  return "pdf";
}

/** Ground truth mock per file statici, altrimenti euristica da nome. */
function baseResult(file: IncomingFile): ClassifyResult {
  const known = SOURCE_FILES.find((x) => x.id === file.id);
  if (known) {
    const c = known.classification;
    return {
      id: known.id,
      tipo: c.tipo,
      macchinaSerial: c.macchinaSerial,
      codice: c.codice,
      revisione: c.revisione,
      data: c.data,
      confidence: c.confidence,
      source: "mock",
    };
  }

  const inferred = inferClassificationFromName(
    file.name,
    parseExt(file.name, file.ext)
  );
  return {
    id: file.id,
    tipo: inferred.tipo,
    macchinaSerial: inferred.macchinaSerial,
    codice: inferred.codice,
    revisione: inferred.revisione,
    data: inferred.data,
    confidence: inferred.confidence,
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
  let files: IncomingFile[] = SOURCE_FILES.map((f) => ({
    id: f.id,
    name: f.name,
    preview: f.preview,
    ext: f.ext,
  }));

  try {
    const body = await req.json();
    if (Array.isArray(body?.files) && body.files.length > 0) {
      files = body.files
        .filter(
          (f: unknown): f is IncomingFile =>
            !!f &&
            typeof f === "object" &&
            typeof (f as IncomingFile).id === "string" &&
            typeof (f as IncomingFile).name === "string"
        )
        .map((f: IncomingFile) => ({
          id: f.id,
          name: f.name,
          preview: typeof f.preview === "string" ? f.preview : f.name,
          ext: f.ext,
        }));
    } else if (Array.isArray(body?.fileIds) && body.fileIds.length > 0) {
      const ids = new Set(
        body.fileIds.filter((x: unknown) => typeof x === "string")
      );
      files = files.filter((f) => ids.has(f.id));
    }
  } catch {
    // corpo assente → usa SOURCE_FILES
  }

  const apiKey = getAnthropicKey();

  if (!apiKey) {
    return NextResponse.json({
      results: files.map(baseResult),
      source: "mock",
    });
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
      return NextResponse.json({
        results: files.map(baseResult),
        source: "mock",
      });
    }

    const parsed = parseJsonArray(llm.text);
    const tipoById = new Map<string, string>(
      (parsed ?? []).map((p) => [String(p.id), String(p.tipo)])
    );

    const results: ClassifyResult[] = files.map((f) => {
      const base = baseResult(f);
      const claudeTipo = tipoById.get(f.id);
      const tipo = (DOC_TYPES.includes(claudeTipo as DocType)
        ? claudeTipo
        : base.tipo) as DocType;
      return { ...base, tipo, source: "anthropic" };
    });

    return NextResponse.json({ results, source: "anthropic" });
  } catch (err) {
    console.error("Classify route error:", err);
    return NextResponse.json({
      results: files.map(baseResult),
      source: "mock",
    });
  }
}
