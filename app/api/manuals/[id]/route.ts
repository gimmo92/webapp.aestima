import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.companyManual.findFirst({
    where: { id, companyId: me.companyId },
  });
  if (!file) {
    return NextResponse.json({ error: "Manuale non trovato" }, { status: 404 });
  }

  const inline =
    file.mimeType === "application/pdf" || file.mimeType.startsWith("text/");
  return new NextResponse(Uint8Array.from(file.content), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.name.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.companyManual.deleteMany({
    where: { id, companyId: me.companyId },
  });
  return NextResponse.json({ ok: true });
}
