import { redirect } from "next/navigation";
import { CompanyUsersPanel } from "@/components/company/CompanyUsersPanel";
import { departmentsFromSettings } from "@/lib/companyDepartments";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export default async function CompanyUtentiPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [users, company] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: me.companyId },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        createdAt: true,
      },
    }),
    prisma.company.findUnique({
      where: { id: me.companyId },
      select: { settingsJson: true },
    }),
  ]);

  return (
    <CompanyUsersPanel
      members={users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department,
        createdAt: u.createdAt.toISOString(),
      }))}
      departments={departmentsFromSettings(company?.settingsJson)}
      canManage={me.role === "OWNER" || me.role === "ADMIN"}
      currentUserId={me.id}
      currentRole={me.role}
    />
  );
}
