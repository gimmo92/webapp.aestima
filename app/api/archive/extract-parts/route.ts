import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  findHeaderRow,
  mergeExtractedParts,
  normalizeColumnMap,
  rowsFromGrid,
  sheetsFromExcelBuffer,
  type ExtractedRow,
} from "@/lib/extractSpareParts";
import type { SparePart } from "@/lib/sparePartTypes";
import { mapSparePart } from "@/lib/workspace/mappers";

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

function sparePartWriteData(p: SparePart) {
  return {
    codiceOEM: p.codiceOEM ?? null,
    nome: p.nome ?? null,
    descrizione: p.descrizione,
    categoria: p.categoria ?? null,
    um: p.um ?? null,
    prezzoListino: p.prezzoListino ?? null,
    fornitore: p.fornitore ?? null,
    codiceFornitore: p.codiceFornitore ?? null,
    brand: p.brand ?? null,
    produttore: p.produttore ?? null,
    leadTimeGiorni: p.leadTimeGiorni ?? null,
    macchinaCompatibile: p.macchinaCompatibile ?? null,
    disponibile: p.disponibile ?? null,
    stato: p.stato,
    completezza: p.completezza,
    daVerificare: p.daVerificare,
    immaginiJson: (p.immagini ?? []) as unknown as Prisma.InputJsonValue,
    sorgentiJson: p.sorgenti as unknown as Prisma.InputJsonValue,
    succedaneiJson: p.succedanei as unknown as Prisma.InputJsonValue,
    conflictFieldsJson: (p.conflictFields ??
      []) as unknown as Prisma.InputJsonValue,
  };
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
    const colMap = normalizeColumnMap(mapping.columns);
    if (!Object.values(colMap).includes("codice")) {
      progress.push({ fileId: file.id, fileName: file.name, rows: 0 });
      continue;
    }

    const buffer = Buffer.from(file.content!);
    let sheets: { sheetName: string; grid: string[][] }[] = [];
    try {
      sheets = await sheetsFromExcelBuffer(buffer, file.name);
    } catch (err) {
      console.error("extract sheet fail", file.name, err);
      continue;
    }

    const preferred =
      sheets.find((s) => s.sheetName === mapping.sheetName) ?? sheets[0];
    if (!preferred) continue;

    const headerIdx =
      mapping.headerIdx != null && mapping.headerIdx >= 0
        ? mapping.headerIdx
        : findHeaderRow(preferred.grid);

    const rows = rowsFromGrid(preferred.grid, headerIdx, colMap, {
      fileId: file.id,
      fileName: file.name,
      sheet: preferred.sheetName,
    });
    extractedAll.push(...rows);
    progress.push({ fileId: file.id, fileName: file.name, rows: rows.length });
  }

  merged = mergeExtractedParts(merged, extractedAll);

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
          ...sparePartWriteData(p),
        },
        update: sparePartWriteData(p),
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
  });
}
