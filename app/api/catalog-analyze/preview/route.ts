import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { mappingPreviewFromExcel } from "@/lib/sparePartAiMap";
import { SPARE_DB_FIELDS } from "@/lib/sparePartMapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const form = await req.formData();
  const blobs = form.getAll("files");
  const ids = form.getAll("fileIds");
  const previews = [];
  let source: "ai" | "heuristic" = "heuristic";

  for (let i = 0; i < blobs.length; i++) {
    const blob = blobs[i];
    if (!(blob instanceof File)) continue;
    const name = blob.name || `catalogo-${i + 1}.xlsx`;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (!["xlsx", "xls", "csv"].includes(ext)) continue;
    const fileId =
      typeof ids[i] === "string" && ids[i] ? String(ids[i]) : name;
    const buffer = Buffer.from(await blob.arrayBuffer());
    try {
      const result = await mappingPreviewFromExcel(buffer, name, fileId);
      if (!result) continue;
      if (result.source === "ai") source = "ai";
      previews.push(result.preview);
    } catch (err) {
      console.error("catalog preview fail", name, err);
    }
  }

  if (previews.length === 0) {
    return NextResponse.json({
      files: [],
      fields: SPARE_DB_FIELDS,
      message: "Nessun foglio Excel/CSV leggibile nel catalogo caricato.",
    });
  }

  return NextResponse.json({
    files: previews,
    fields: SPARE_DB_FIELDS,
    source,
  });
}
