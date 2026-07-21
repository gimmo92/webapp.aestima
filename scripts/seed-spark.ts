import "dotenv/config";
import { prisma } from "../lib/prisma";
import {
  clearCompanyWorkspace,
  DEMO_COMPANY_SLUG,
  seedSparkDemo,
} from "../lib/workspace/seed";

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
  });

  for (const c of companies) {
    if (c.slug === DEMO_COMPANY_SLUG) continue;
    await clearCompanyWorkspace(c.id);
    console.log(`Svuotata: ${c.name} (${c.slug})`);
  }

  const spark = await seedSparkDemo({ force: true });
  const counts = {
    requests: await prisma.partRequest.count({ where: { companyId: spark.id } }),
    tickets: await prisma.serviceTicket.count({ where: { companyId: spark.id } }),
    technicians: await prisma.technician.count({
      where: { companyId: spark.id },
    }),
    knowledge: await prisma.knowledgeEntry.count({
      where: { companyId: spark.id },
    }),
    conversations: await prisma.conversation.count({
      where: { companyId: spark.id },
    }),
  };
  console.log(`Seed Spark ok:`, counts);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
