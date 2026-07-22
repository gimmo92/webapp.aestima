import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { SOURCE_FILES } from "@/lib/archiveData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEMO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  png: "image/png",
};

/** Stream del contenuto file archivio (DB) o redirect ai mock pubblici. */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const me = await getCurrentUser();

  if (me) {
    const row = await prisma.archiveFile.findFirst({
      where: { id, companyId: me.companyId },
      select: { content: true, mimeType: true, name: true, ext: true },
    });
    if (row?.content) {
      const bytes = Buffer.from(row.content);
      return new NextResponse(bytes, {
        headers: {
          "Content-Type":
            row.mimeType ||
            DEMO_MIME[row.ext] ||
            "application/octet-stream",
          "Content-Disposition": `inline; filename="${encodeURIComponent(row.name)}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }
  }

  const demo = SOURCE_FILES.find((f) => f.id === id);
  if (demo?.publicUrl) {
    return NextResponse.redirect(new URL(demo.publicUrl, _req.url));
  }

  return NextResponse.json({ error: "Documento non trovato." }, { status: 404 });
}
