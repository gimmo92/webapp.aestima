import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  formatDate,
  formatSize,
  parseExt,
} from "@/lib/uploadSourceFile";
import { inferClassificationFromName } from "@/lib/classifyHeuristics";
import type { FileExt, SourceFile } from "@/lib/archiveTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 20;

const MIME: Record<FileExt, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  png: "image/png",
  dwg: "application/acad",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function canPreview(ext: FileExt) {
  return ext === "xlsx" || ext === "pdf" || ext === "jpg" || ext === "png";
}

function contentUrl(id: string) {
  return `/api/archive/files/${id}/content`;
}

/** Upload multipart: salva file archivio in Postgres (Bytes) per company. */
export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "FormData non valido" }, { status: 400 });
  }

  const entries = form.getAll("files").filter((v): v is File => v instanceof File);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (entries.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Massimo ${MAX_FILES} file per upload` },
      { status: 400 }
    );
  }

  const created: SourceFile[] = [];

  for (const file of entries) {
    const ext = parseExt(file.name);
    if (!ext) continue;
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${file.name}: dimensione massima 12 MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const classification = inferClassificationFromName(file.name, ext);
    const modified = formatDate(file.lastModified || Date.now());
    const sizeLabel = formatSize(file.size);
    const preview = `File caricato dall'operatore: ${file.name}`;

    const row = await prisma.archiveFile.create({
      data: {
        companyId: me.companyId,
        name: file.name,
        ext,
        sizeLabel,
        modified,
        preview,
        mimeType: file.type || MIME[ext],
        content: buffer,
        classificationJson: classification as unknown as Prisma.InputJsonValue,
      },
    });

    created.push({
      id: row.id,
      name: row.name,
      ext: row.ext as FileExt,
      sizeLabel: row.sizeLabel,
      modified: row.modified,
      preview: row.preview,
      classification,
      uploaded: true,
      publicUrl: canPreview(ext) ? contentUrl(row.id) : undefined,
    });
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: "Nessun file con estensione supportata" },
      { status: 400 }
    );
  }

  return NextResponse.json({ files: created });
}
