import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import {
  findHeaderRow,
  sheetsFromExcelBuffer,
  type ColumnKey,
} from "@/lib/extractSpareParts";
import { suggestColumnMapping } from "@/lib/sparePartAiMap";
import { SPARE_DB_FIELDS } from "@/lib/sparePartMapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { fileIds?: string[] };

export type MappingColumnPreview = {
  index: number;
  header: string;
  sample: string[];
  field: ColumnKey;
};

export type MappingFilePreview = {
  fileId: string;
  fileName: string;
  sheetName: string;
  headerIdx: number;
  rowCount: number;
  columns: MappingColumnPreview[];
};

function pickBestSheet(
  sheets: { sheetName: string; grid: string[][] }[]
): { sheetName: string; grid: string[][] } | null {
  const ranked = [...sheets].sort((a, b) => b.grid.length - a.grid.length);
  return ranked[0] ?? null;
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const files = await prisma.archiveFile.findMany({
    where: {
      companyId: me.companyId,
      ...(body.fileIds?.length ? { id: { in: body.fileIds } } : {}),
      ext: { in: ["xlsx", "xls", "csv"] },
    },
    select: { id: true, name: true, ext: true, content: true },
  });

  const extractable = files.filter((f) => f.content && f.content.length > 0);
  if (extractable.length === 0) {
    return NextResponse.json({
      files: [] as MappingFilePreview[],
      fields: SPARE_DB_FIELDS,
      message:
        "Nessun Excel/CSV con contenuto. Carica un listino in archivio e riprova.",
    });
  }

  const previews: MappingFilePreview[] = [];
  let source: "ai" | "heuristic" = "heuristic";

  for (const file of extractable) {
    const buffer = Buffer.from(file.content!);
    let sheets: { sheetName: string; grid: string[][] }[] = [];
    try {
      sheets = await sheetsFromExcelBuffer(buffer, file.name);
    } catch (err) {
      console.error("preview sheet fail", file.name, err);
      continue;
    }
    const best = pickBestSheet(sheets);
    if (!best) continue;
    const headerIdx = findHeaderRow(best.grid);
    const headers = (best.grid[headerIdx] ?? []).map((h) => String(h ?? ""));
    const sampleRows = best.grid
      .slice(headerIdx + 1, headerIdx + 4)
      .map((r) => headers.map((_, i) => String(r[i] ?? "")));
    const suggested = await suggestColumnMapping(headers, sampleRows);
    if (suggested.source === "ai") source = "ai";

    previews.push({
      fileId: file.id,
      fileName: file.name,
      sheetName: best.sheetName,
      headerIdx,
      rowCount: Math.max(0, best.grid.length - headerIdx - 1),
      columns: headers.map((header, index) => ({
        index,
        header: header || `(colonna ${index + 1})`,
        sample: sampleRows
          .map((r) => r[index] ?? "")
          .filter(Boolean)
          .slice(0, 3),
        field: suggested.map[index] ?? "ignore",
      })),
    });
  }

  return NextResponse.json({
    files: previews,
    fields: SPARE_DB_FIELDS,
    source,
  });
}
