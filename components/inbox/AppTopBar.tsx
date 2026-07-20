import { getCurrentUser } from "@/lib/auth/user";
import { InboxTopBar } from "./InboxTopBar";

/** Top bar server-side con company/utente dalla sessione. */
export async function AppTopBar() {
  const user = await getCurrentUser();
  return (
    <InboxTopBar
      companyName={user?.company.name}
      userName={user?.name}
    />
  );
}
