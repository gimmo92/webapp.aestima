// Prisma CLI config — migrations/introspection usano DIRECT_URL (session pooler).
// Il runtime (Prisma Client) usa DATABASE_URL (transaction pooler) in lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // DIRECT_URL per migrate/db push; fallback a DATABASE_URL se assente.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
