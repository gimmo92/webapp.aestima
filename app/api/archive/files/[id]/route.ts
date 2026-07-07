import { NextResponse } from "next/server";
import { SOURCE_FILES } from "@/lib/archiveData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Metadati documento archivio (demo REST). */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const file = SOURCE_FILES.find((f) => f.id === id);
  if (!file) {
    return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
  }

  return NextResponse.json({
    id: file.id,
    name: file.name,
    ext: file.ext,
    sizeLabel: file.sizeLabel,
    modified: file.modified,
    preview: file.preview,
    downloadUrl: file.publicUrl ?? null,
    classification: file.classification,
  });
}
