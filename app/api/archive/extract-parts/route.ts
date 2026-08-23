import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import {
  extractRowsFromMappedWorkbook,
  mergeExtractedParts,
  type ExtractedRow,
} from "@/lib/extractSpareParts";
import { persistSparePartsForCompany } from "@/lib/persistSpareParts";
import { mapSparePart } from "@/lib/workspace/mappers";
import type { SparePart } from "@/lib/sparePartTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type MappingPayload = {
  sheetName?: string;
  headerIdx?: number;
  columns: Record<string, string>;
};

type Body = {
  fileIds?: string[];
  mappings: Record<string, MappingPayload>;
};

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

  if (!body.mappings || typeof body.mappings !== "object") {
    return NextResponse.json(
      {
        error:
          "Mappatura colonne mancante. Conferma la schermata di mapping.",
      },
      { status: 400 }
    );
  }

  const requestedIds = Object.keys(body.mappings);
  const files = await prisma.archiveFile.findMany({
    where: {
      companyId: me.companyId,
      id: { in: body.fileIds?.length ? body.fileIds : requestedIds },
      ext: { in: ["xlsx", "xls", "csv"] },
    },
    select: { id: true, name: true, ext: true, content: true },
  });

  const extractable = files.filter((f) => f.content && f.content.length > 0);
  if (extractable.length === 0) {
    return NextResponse.json({
      parts: [],
      extractedRows: 0,
      message: "Nessun Excel/CSV con contenuto da importare.",
    });
  }

  const existingRows = await prisma.sparePart.findMany({
    where: { companyId: me.companyId },
  });
  let merged: SparePart[] = existingRows.map(mapSparePart);
  const extractedAll: ExtractedRow[] = [];
  const progress: { fileId: string; fileName: string; rows: number }[] = [];

  for (const file of extractable) {
    const mapping = body.mappings[file.id];
    if (!mapping) continue;
    const buffer = Buffer.from(file.content!);
    try {
      const rows = await extractRowsFromMappedWorkbook(
        buffer,
        file.name,
        file.id,
        {
          sheetName: mapping.sheetName,
          headerIdx: mapping.headerIdx,
          columns: mapping.columns,
        }
      );
      extractedAll.push(...rows);
      progress.push({
        fileId: file.id,
        fileName: file.name,
        rows: rows.length,
      });
    } catch (err) {
      console.error("extract sheet fail", file.name, err);
    }
  }

  merged = mergeExtractedParts(merged, extractedAll);
  const saved = await persistSparePartsForCompany(me.companyId, merged);

  return NextResponse.json({
    parts: saved,
    progress: {
      done: progress.length,
      total: extractable.length,
      files: progress,
    },
    extractedRows: extractedAll.length,
  });
}
