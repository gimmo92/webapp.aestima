import "dotenv/config";
import { prisma } from "../lib/prisma";
import type { Prisma } from "../lib/generated/prisma/client";
import { DEFAULT_LABELS } from "../lib/inboxData";
import { DEMATIC_INBOX_EMAILS } from "../lib/dematicInboxData";

function asJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return value as Prisma.InputJsonValue;
}

function nid(companyId: string, kind: string, oldId: string) {
  return `${kind}_${companyId.slice(-10)}_${oldId}`;
}

async function findDematicCompany() {
  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { name: { equals: "Dematic", mode: "insensitive" } },
        { slug: { contains: "dematic", mode: "insensitive" } },
      ],
    },
  });
  if (!company) {
    throw new Error('Company "Dematic" non trovata');
  }
  return company;
}

async function ensureLabels(companyId: string) {
  const existing = await prisma.label.findMany({ where: { companyId } });
  const byName = new Map(existing.map((l) => [l.name.toLowerCase(), l]));
  const labelMap = new Map<string, string>();

  for (const l of DEFAULT_LABELS) {
    const found = byName.get(l.name.toLowerCase());
    if (found) {
      labelMap.set(l.id, found.id);
      continue;
    }
    const id = nid(companyId, "lbl", l.id);
    await prisma.label.create({
      data: { id, companyId, name: l.name, color: l.color },
    });
    labelMap.set(l.id, id);
  }

  return labelMap;
}

async function seedDematicEmails(companyId: string) {
  const labelMap = await ensureLabels(companyId);
  const ids = DEMATIC_INBOX_EMAILS.map((r) => nid(companyId, "req", r.id));

  await prisma.partRequestLabel.deleteMany({
    where: { partRequestId: { in: ids } },
  });
  await prisma.partRequest.deleteMany({
    where: { id: { in: ids } },
  });

  const now = Date.now();
  for (let i = 0; i < DEMATIC_INBOX_EMAILS.length; i++) {
    const r = DEMATIC_INBOX_EMAILS[i];
    await prisma.partRequest.create({
      data: {
        id: nid(companyId, "req", r.id),
        companyId,
        fromName: r.from,
        fromEmail: r.fromEmail,
        customerCompany: r.company,
        subject: r.subject,
        body: r.body,
        status: r.status,
        primary: r.primary,
        receivedAt: new Date(now - i * 36 * 60 * 1000),
        receivedLabel: r.receivedLabel,
        receivedFull: r.receivedFull,
        attachmentsJson: asJson(r.attachments),
        labels: {
          create: r.labelIds
            .map((old) => labelMap.get(old))
            .filter((x): x is string => Boolean(x))
            .map((labelId) => ({ labelId })),
        },
      },
    });
  }
}

async function main() {
  const company = await findDematicCompany();
  await seedDematicEmails(company.id);

  const created = await prisma.partRequest.findMany({
    where: {
      companyId: company.id,
      id: { contains: "dematic-req" },
    },
    select: { id: true, subject: true, fromEmail: true, receivedLabel: true },
    orderBy: { receivedAt: "desc" },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        company: { id: company.id, name: company.name, slug: company.slug },
        emails: created,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
