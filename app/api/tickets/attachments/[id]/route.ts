import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.ticketAttachment.findFirst({
    where: { id, companyId: me.companyId },
  });
  if (!file) {
    return NextResponse.json({ error: "Allegato non trovato" }, { status: 404 });
  }

  const inline = file.kind === "image" || file.mimeType === "application/pdf";
  return new NextResponse(Uint8Array.from(file.content), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
