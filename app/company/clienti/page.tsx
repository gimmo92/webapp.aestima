import { redirect } from "next/navigation";
import { CompanyCustomersPanel } from "@/components/company/CompanyCustomersPanel";
import { getCurrentUser } from "@/lib/auth/user";

export default async function CompanyClientiPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <CompanyCustomersPanel canManage={me.role === "OWNER" || me.role === "ADMIN"} />
  );
}
