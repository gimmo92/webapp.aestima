import "dotenv/config";
import { clearAllCompanyWorkspaces } from "../lib/workspace/seed";
import { prisma } from "../lib/prisma";

async function main() {
  const n = await clearAllCompanyWorkspaces();
  console.log(`Workspace svuotati: ${n} company`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
