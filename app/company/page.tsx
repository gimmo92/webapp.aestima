import { redirect } from "next/navigation";
import { AppTopBar } from "@/components/inbox/AppTopBar";
import { CompanyWorkspace } from "@/components/company/CompanyWorkspace";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export default async function CompanyPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: me.companyId },
    include: {
      users: {
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  if (!company) redirect("/login");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <AppTopBar />
      <CompanyWorkspace
        company={{
          id: company.id,
          name: company.name,
          slug: company.slug,
          createdAt: company.createdAt.toLocaleDateString("it-IT"),
        }}
        members={company.users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
        }))}
        canManage={me.role === "OWNER" || me.role === "ADMIN"}
      />
    </div>
  );
}
