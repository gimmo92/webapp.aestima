import { redirect } from "next/navigation";
import { CompanySettingsForm } from "@/components/company/CompanySettingsForm";
import { parseCompanyProfile } from "@/lib/companyProfile";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";

export default async function CompanyModificaPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const company = await prisma.company.findUnique({
    where: { id: me.companyId },
    select: {
      name: true,
      slug: true,
      createdAt: true,
      settingsJson: true,
    },
  });
  if (!company) redirect("/login");

  return (
    <CompanySettingsForm
      company={{
        name: company.name,
        slug: company.slug,
        createdAt: company.createdAt.toLocaleDateString("it-IT"),
      }}
      profile={parseCompanyProfile(company.settingsJson)}
      canManage={me.role === "OWNER" || me.role === "ADMIN"}
    />
  );
}
