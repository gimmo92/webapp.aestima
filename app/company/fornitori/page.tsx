import { redirect } from "next/navigation";
import { CompanySuppliersPanel } from "@/components/company/CompanySuppliersPanel";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export default async function CompanyFornitoriPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const users = await prisma.user.findMany({
    where: { companyId: me.companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <CompanySuppliersPanel
      canManage={me.role === "OWNER" || me.role === "ADMIN"}
      users={users}
    />
  );
}
