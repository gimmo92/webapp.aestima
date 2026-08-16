import { redirect } from "next/navigation";
import { CompanyCustomersPanel } from "@/components/company/CompanyCustomersPanel";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export default async function CompanyClientiPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const users = await prisma.user.findMany({
    where: { companyId: me.companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <CompanyCustomersPanel
      canManage={me.role === "OWNER" || me.role === "ADMIN"}
      users={users}
    />
  );
}
