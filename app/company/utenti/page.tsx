import { redirect } from "next/navigation";
import { CompanyUsersPanel } from "@/components/company/CompanyUsersPanel";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export default async function CompanyUtentiPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const users = await prisma.user.findMany({
    where: { companyId: me.companyId },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  return (
    <CompanyUsersPanel
      members={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      }))}
      canManage={me.role === "OWNER" || me.role === "ADMIN"}
      currentUserId={me.id}
      currentRole={me.role}
    />
  );
}
