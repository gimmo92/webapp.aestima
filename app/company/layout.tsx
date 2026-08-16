import { redirect } from "next/navigation";
import { AppTopBar } from "@/components/inbox/AppTopBar";
import { CompanySidebar } from "@/components/company/CompanySidebar";
import { getCurrentUser } from "@/lib/auth/user";

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <AppTopBar />
      <div className="flex min-h-0 flex-1">
        <CompanySidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
