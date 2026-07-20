import { prisma } from "@/lib/prisma";
import { readSession } from "./session";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  companyId: string;
  company: {
    id: string;
    name: string;
    slug: string;
  };
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      companyId: true,
      company: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!user || user.companyId !== session.companyId) return null;
  return user;
}

export function slugifyCompanyName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
