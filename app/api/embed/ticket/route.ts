import { NextResponse } from "next/server";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { firstOpenStageId, newTicketId, normalizeTicketStages } from "@/lib/ticketData";
import { fieldByKey, normalizeTicketForm } from "@/lib/ticketForm";
import { formatSize } from "@/lib/uploadSourceFile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const MAX_FILES = 6;

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic"]);
const DOC_EXT = new Set(["pdf", "doc", "docx", "xls", "xlsx", "txt"]);

function fileKind(name: string, mime: string): "image" | "document" | null {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return "image";
  if (DOC_EXT.has(ext) || mime === "application/pdf") return "document";
  return null;
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("company")?.trim() ?? "";
  if (!slug) {
    return NextResponse.json({ error: "Company mancante" }, { status: 400 });
  }
  const company = await prisma.company.findUnique({
    where: { slug },
    select: { name: true, slug: true, settingsJson: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company non trovata" }, { status: 404 });
  }
  return NextResponse.json({
    name: company.name,
    slug: company.slug,
    form: normalizeTicketForm(
      (company.settingsJson as { ticketForm?: unknown } | null)?.ticketForm
    ),
  });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Form non valido" }, { status: 400 });
  }

  const slug = String(form.get("company") ?? "").trim();
  if (!slug) return NextResponse.json({ error: "Company mancante" }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { slug },
    select: { id: true, settingsJson: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company non trovata" }, { status: 404 });
  }

  const ticketForm = normalizeTicketForm(
    (company.settingsJson as { ticketForm?: unknown } | null)?.ticketForm
  );
  const valueOf = (key: string) => String(form.get(key) ?? "").trim();

  for (const field of ticketForm.fields) {
    if (!field.enabled || field.type === "files") continue;
    const value = valueOf(field.key);
    if (field.required && !value) {
      return NextResponse.json(
        { error: `Compila il campo "${field.label.trim() || field.key}".` },
        { status: 400 }
      );
    }
    if (field.type === "email" && value && !value.includes("@")) {
      return NextResponse.json({ error: "Email non valida." }, { status: 400 });
    }
  }

  const customerName = valueOf("customerName");
  const customerEmail = valueOf("customerEmail").toLowerCase();
  const customerPhone = valueOf("customerPhone");
  const customerCompany = valueOf("customerCompany");
  let summary = valueOf("summary");
  let description = valueOf("description");
  const machineModel = valueOf("machineModel");
  const machineSerial = valueOf("machineSerial");
  const categoryRaw = valueOf("category") || "altro";
  const priorityRaw = valueOf("priority") || "normale";

  if (!summary) summary = description.slice(0, 80) || "Richiesta da form";
  if (!description) description = summary;

  const category =
    categoryRaw === "ricambio" || categoryRaw === "troubleshooting"
      ? categoryRaw
      : "altro";
  const priority = priorityRaw === "alta" ? "alta" : "normale";

  const formExtra: Record<string, string> = {};
  for (const field of ticketForm.fields) {
    if (field.builtIn || !field.enabled || field.type === "files") continue;
    const value = valueOf(field.key);
    if (value) formExtra[field.label] = value;
  }

  const files = form
    .getAll("files")
    .filter((v): v is File => v instanceof File && v.size > 0);
  const attachmentsField = fieldByKey(ticketForm, "attachments");
  if (attachmentsField?.enabled && attachmentsField.required && files.length === 0) {
    return NextResponse.json(
      { error: `Allega almeno un file in "${attachmentsField.label}".` },
      { status: 400 }
    );
  }
  if (!attachmentsField?.enabled && files.length > 0) {
    return NextResponse.json({ error: "Allegati non previsti." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Puoi allegare al massimo ${MAX_FILES} file.` },
      { status: 400 }
    );
  }

  const prepared: Array<{
    name: string;
    mimeType: string;
    sizeLabel: string;
    kind: "image" | "document";
    content: Uint8Array<ArrayBuffer>;
  }> = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${file.name}: dimensione massima 8 MB.` },
        { status: 400 }
      );
    }
    const kind = fileKind(file.name, file.type);
    if (!kind) {
      return NextResponse.json(
        { error: `${file.name}: formato non supportato.` },
        { status: 400 }
      );
    }
    prepared.push({
      name: file.name.slice(0, 180),
      mimeType: file.type || (kind === "image" ? "image/jpeg" : "application/octet-stream"),
      sizeLabel: formatSize(file.size),
      kind,
      content: new Uint8Array(await file.arrayBuffer()) as Uint8Array<ArrayBuffer>,
    });
  }

  const stages = normalizeTicketStages(
    (company.settingsJson as { ticketStages?: unknown } | null)?.ticketStages
  );
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const createdLabel = `${hh}:${mm}`;
  const createdFull = now.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  let id = newTicketId();
  for (let i = 0; i < 6; i += 1) {
    const exists = await prisma.serviceTicket.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) break;
    id = newTicketId();
  }

  await prisma.serviceTicket.create({
    data: {
      id,
      companyId: company.id,
      status: firstOpenStageId(stages),
      priority,
      source: "form",
      category,
      summary,
      description,
      machineModel: machineModel || null,
      machineSerial: machineSerial || null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      customerCompany: customerCompany || null,
      formExtraJson:
        Object.keys(formExtra).length > 0
          ? (formExtra as Prisma.InputJsonValue)
          : undefined,
      createdLabel,
      createdFull,
      updatedFull: createdFull,
      attachments: {
        create: prepared.map((f) => ({
          name: f.name,
          mimeType: f.mimeType,
          sizeLabel: f.sizeLabel,
          kind: f.kind,
          content: f.content,
          company: { connect: { id: company.id } },
        })),
      },
    },
  });

  return NextResponse.json({ ok: true, id });
}
