import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { listCompanyManuals } from "@/lib/companyManuals";
import {
  MANUAL_MAX_BYTES,
  extractManualText,
  manualExt,
} from "@/lib/manualText";
import { formatSize } from "@/lib/uploadSourceFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILES = 10;

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  text: "text/plain",
};

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }
  const manuals = await listCompanyManuals(me.companyId);
  return NextResponse.json({ manuals });
}

/** Upload multipart: salva i manuali della company e ne estrae il testo per la chat. */
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

  const entries = form
    .getAll("files")
    .filter((value): value is File => value instanceof File);
  if (entries.length === 0) {
    return NextResponse.json({ error: "Nessun file" }, { status: 400 });
  }
  if (entries.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Massimo ${MAX_FILES} file per upload` },
      { status: 400 }
    );
  }

  const createdIds: string[] = [];

  for (const file of entries) {
    const ext = manualExt(file.name);
    if (!ext) continue;
    if (file.size > MANUAL_MAX_BYTES) {
      return NextResponse.json(
        { error: `${file.name}: dimensione massima 12 MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const extracted = extractManualText(file.name, buffer);
    const row = await prisma.companyManual.create({
      data: {
        companyId: me.companyId,
        name: file.name,
        mimeType: file.type || MIME[ext],
        sizeLabel: formatSize(file.size),
        content: new Uint8Array(buffer),
        extractedText: extracted.text,
        textExtracted: extracted.extracted,
      },
      select: { id: true },
    });
    createdIds.push(row.id);
  }

  if (createdIds.length === 0) {
    return NextResponse.json(
      { error: "Nessun file PDF o testo (.txt, .md)" },
      { status: 400 }
    );
  }

  const manuals = await listCompanyManuals(me.companyId);
  return NextResponse.json({
    manuals,
    createdIds,
  });
}
