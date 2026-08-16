import { redirect } from "next/navigation";
import { CompanySuppliersPanel } from "@/components/company/CompanySuppliersPanel";
import { getCurrentUser } from "@/lib/auth/user";

export default async function CompanyFornitoriPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <CompanySuppliersPanel canManage={me.role === "OWNER" || me.role === "ADMIN"} />
  );
}
