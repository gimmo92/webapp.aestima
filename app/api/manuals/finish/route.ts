import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { MANUAL_MAX_BYTES, manualExt } from "@/lib/manualText";
import { saveCompanyManual } from "@/lib/saveCompanyManual";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_PARTS = 8;

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    uploadId?: unknown;
    name?: unknown;
    total?: unknown;
  } | null;
  const uploadId = String(body?.uploadId ?? "");
  const name = String(body?.name ?? "").trim().slice(0, 180);
  const total = Number(body?.total);
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(uploadId) || !manualExt(name)) {
    return NextResponse.json(
      { error: "Serve un file PDF o testo (.txt, .md)" },
      { status: 400 }
    );
  }
  if (!Number.isInteger(total) || total < 1 || total > MAX_PARTS) {
    return NextResponse.json({ error: "Upload non valido" }, { status: 400 });
  }

  const parts = await prisma.manualUploadPart.findMany({
    where: { companyId: me.companyId, uploadId },
    orderBy: { partIndex: "asc" },
  });
  if (parts.length !== total || parts.some((part, index) => part.partIndex !== index)) {
    return NextResponse.json(
      { error: "Caricamento incompleto. Riprova." },
      { status: 400 }
    );
  }

  const buffer = Buffer.concat(parts.map((part) => Buffer.from(part.content)));
  await prisma.manualUploadPart.deleteMany({
    where: { companyId: me.companyId, uploadId },
  });

  if (buffer.length > MANUAL_MAX_BYTES) {
    return NextResponse.json(
      { error: `${name}: dimensione massima 12 MB` },
      { status: 400 }
    );
  }

  try {
    const manuals = await saveCompanyManual(me.companyId, name, buffer);
    return NextResponse.json({ manuals });
  } catch (error) {
    console.error("manual finish", error);
    return NextResponse.json(
      { error: "Salvataggio del manuale non riuscito" },
      { status: 500 }
    );
  }
}
