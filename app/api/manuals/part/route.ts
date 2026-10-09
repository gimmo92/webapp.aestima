import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PART_MAX_BYTES = 3 * 1024 * 1024;
const MAX_PARTS = 8;

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

  const uploadId = String(form.get("uploadId") ?? "");
  const index = Number(form.get("index"));
  const total = Number(form.get("total"));
  const file = form.get("file");
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(uploadId)) {
    return NextResponse.json({ error: "Upload non valido" }, { status: 400 });
  }
  if (!Number.isInteger(index) || !Number.isInteger(total)) {
    return NextResponse.json({ error: "Parte non valida" }, { status: 400 });
  }
  if (index < 0 || total < 1 || total > MAX_PARTS || index >= total) {
    return NextResponse.json({ error: "Parte non valida" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (file.size > PART_MAX_BYTES) {
    return NextResponse.json({ error: "Parte troppo grande" }, { status: 400 });
  }

  try {
    const content = new Uint8Array(await file.arrayBuffer());
    await prisma.manualUploadPart.upsert({
      where: {
        companyId_uploadId_partIndex: {
          companyId: me.companyId,
          uploadId,
          partIndex: index,
        },
      },
      create: {
        companyId: me.companyId,
        uploadId,
        partIndex: index,
        content,
      },
      update: { content },
    });
  } catch (error) {
    console.error("manual part", error);
    return NextResponse.json(
      { error: "Salvataggio della parte non riuscito" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
