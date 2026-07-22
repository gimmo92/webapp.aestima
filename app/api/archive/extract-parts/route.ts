import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { callAnthropicMessages, getAnthropicKey } from "@/lib/anthropicKey";
import {
  findHeaderRow,
  mapColumnsHeuristic,
  mergeExtractedParts,
  rowsFromGrid,
  type ColumnKey,
  type ExtractedRow,
} from "@/lib/extractSpareParts";
import type { SparePart } from "@/lib/sparePartTypes";
import { mapSparePart } from "@/lib/workspace/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  fileIds?: string[];
};

const MAP_SYSTEM = `Sei un assistente che mappa colonne di un foglio Excel ricambi industriali alle chiavi canoniche.
Chiavi ammesse: codice, codiceOEM, descrizione, categoria, um, prezzoListino, fornitore, codiceFornitore, leadTimeGiorni, macchinaCompatibile, stato, ignore.
Rispondi SOLO con un oggetto JSON: {"0":"codice","1":"descrizione",...} dove la chiave è l'indice colonna (stringa) e il valore è la chiave canonica.
Ogni chiave (tranne ignore) al massimo una volta.`;

function parseColumnMap(text: string): Record<number, ColumnKey> | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const obj = JSON.parse(match ? match[0] : text) as Record<string, string>;
    const out: Record<number, ColumnKey> = {};
    const allowed = new Set([
      "codice",
      "codiceOEM",
      "descrizione",
      "categoria",
      "um",
      "prezzoListino",
      "fornitore",
      "codiceFornitore",
      "leadTimeGiorni",
      "macchinaCompatibile",
      "stato",
      "ignore",
    ]);
    for (const [k, v] of Object.entries(obj)) {
      const idx = Number(k);
      if (!Number.isFinite(idx) || !allowed.has(v)) continue;
      out[idx] = v as ColumnKey;
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

async function mapColumnsWithLlm(
  headers: string[]
): Promise<Record<number, ColumnKey> | null> {
  if (!getAnthropicKey()) return null;
  const llm = await callAnthropicMessages({
    system: MAP_SYSTEM,
    user: `Header colonne (indice: testo):\n${headers
      .map((h, i) => `${i}: ${h}`)
      .join("\n")}`,
    maxTokens: 800,
  });
  if (!llm.ok) return null;
  return parseColumnMap(llm.text);
}

async function gridFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<{ sheetName: string; grid: string[][] }[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheets: { sheetName: string; grid: string[][] }[] = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as string[][];
    if (grid.length < 2) continue;
    // Skip fogli analisi / parametri tipici
    if (/parametr|analisi|note/i.test(sheetName) && grid.length < 15) continue;
    sheets.push({
      sheetName,
      grid: grid.map((r) => r.map((c) => String(c ?? ""))),
    });
  }
  if (sheets.length === 0 && /csv$/i.test(fileName)) {
    // fallback handled by xlsx for csv too
  }
  return sheets;
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  const files = await prisma.archiveFile.findMany({
    where: {
      companyId: me.companyId,
      ...(body.fileIds?.length ? { id: { in: body.fileIds } } : {}),
      ext: { in: ["xlsx", "xls", "csv"] },
    },
    select: {
      id: true,
      name: true,
      ext: true,
      content: true,
      classificationJson: true,
    },
  });

  const extractable = files.filter((f) => f.content && f.content.length > 0);
  if (extractable.length === 0) {
    return NextResponse.json({
      parts: [],
      progress: { done: 0, total: 0 },
      message:
        "Nessun file Excel/CSV con contenuto in archivio. Carica listini o distinte e riprova.",
    });
  }

  const existingRows = await prisma.sparePart.findMany({
    where: { companyId: me.companyId },
  });
  let merged: SparePart[] = existingRows.map(mapSparePart);
  const extractedAll: ExtractedRow[] = [];
  const progress: { fileId: string; fileName: string; rows: number }[] = [];

  for (const file of extractable) {
    const buffer = Buffer.from(file.content!);
    let sheets: { sheetName: string; grid: string[][] }[] = [];
    try {
      sheets = await gridFromBuffer(buffer, file.name);
    } catch (err) {
      console.error("extract sheet fail", file.name, err);
      continue;
    }

    let fileRows = 0;
    for (const { sheetName, grid } of sheets) {
      const headerIdx = findHeaderRow(grid);
      const headers = (grid[headerIdx] ?? []).map((h) => String(h ?? ""));
      let colMap = mapColumnsHeuristic(headers);
      if (!colMap[0] && !Object.values(colMap).includes("codice")) {
        const llmMap = await mapColumnsWithLlm(headers);
        if (llmMap) colMap = llmMap;
      }
      // Serve almeno codice
      if (!Object.values(colMap).includes("codice")) continue;

      const rows = rowsFromGrid(grid, headerIdx, colMap, {
        fileId: file.id,
        fileName: file.name,
        sheet: sheetName,
      });
      extractedAll.push(...rows);
      fileRows += rows.length;
    }
    progress.push({ fileId: file.id, fileName: file.name, rows: fileRows });
  }

  merged = mergeExtractedParts(merged, extractedAll);

  // Persist upsert
  await prisma.$transaction(
    merged.map((p) =>
      prisma.sparePart.upsert({
        where: {
          companyId_codice: { companyId: me.companyId, codice: p.codice },
        },
        create: {
          id: p.id,
          companyId: me.companyId,
          codice: p.codice,
          codiceOEM: p.codiceOEM ?? null,
          descrizione: p.descrizione,
          categoria: p.categoria ?? null,
          um: p.um ?? null,
          prezzoListino: p.prezzoListino ?? null,
          fornitore: p.fornitore ?? null,
          codiceFornitore: p.codiceFornitore ?? null,
          leadTimeGiorni: p.leadTimeGiorni ?? null,
          macchinaCompatibile: p.macchinaCompatibile ?? null,
          stato: p.stato,
          completezza: p.completezza,
          daVerificare: p.daVerificare,
          sorgentiJson: p.sorgenti as unknown as Prisma.InputJsonValue,
          succedaneiJson: p.succedanei as unknown as Prisma.InputJsonValue,
          conflictFieldsJson: (p.conflictFields ??
            []) as unknown as Prisma.InputJsonValue,
        },
        update: {
          codiceOEM: p.codiceOEM ?? null,
          descrizione: p.descrizione,
          categoria: p.categoria ?? null,
          um: p.um ?? null,
          prezzoListino: p.prezzoListino ?? null,
          fornitore: p.fornitore ?? null,
          codiceFornitore: p.codiceFornitore ?? null,
          leadTimeGiorni: p.leadTimeGiorni ?? null,
          macchinaCompatibile: p.macchinaCompatibile ?? null,
          stato: p.stato,
          completezza: p.completezza,
          daVerificare: p.daVerificare,
          sorgentiJson: p.sorgenti as unknown as Prisma.InputJsonValue,
          succedaneiJson: p.succedanei as unknown as Prisma.InputJsonValue,
          conflictFieldsJson: (p.conflictFields ??
            []) as unknown as Prisma.InputJsonValue,
        },
      })
    )
  );

  const saved = await prisma.sparePart.findMany({
    where: { companyId: me.companyId },
    orderBy: { codice: "asc" },
  });

  return NextResponse.json({
    parts: saved.map(mapSparePart),
    progress: {
      done: progress.length,
      total: extractable.length,
      files: progress,
    },
    extractedRows: extractedAll.length,
    source: getAnthropicKey() ? "anthropic+heuristic" : "heuristic",
  });
}
