import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { SOURCE_FILES } from "@/lib/archiveData";
import type { FileClassification, FileExt } from "@/lib/archiveTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Metadati documento archivio (DB o demo). */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const me = await getCurrentUser();

  if (me) {
    const row = await prisma.archiveFile.findFirst({
      where: { id, companyId: me.companyId },
    });
    if (row) {
      return NextResponse.json({
        id: row.id,
        name: row.name,
        ext: row.ext,
        sizeLabel: row.sizeLabel,
        modified: row.modified,
        preview: row.preview,
        downloadUrl: `/api/archive/files/${row.id}/content`,
        classification: row.classificationJson as unknown as FileClassification,
        resolvedSerial: row.resolvedSerial,
      });
    }
  }

  const file = SOURCE_FILES.find((f) => f.id === id);
  if (!file) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  return NextResponse.json({
    id: file.id,
    name: file.name,
    ext: file.ext as FileExt,
    sizeLabel: file.sizeLabel,
    modified: file.modified,
    preview: file.preview,
    downloadUrl: file.publicUrl ?? null,
    classification: file.classification,
  });
}
