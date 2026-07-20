import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { loadCompanyWorkspace } from "@/lib/workspace/load";

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const workspace = await loadCompanyWorkspace(me.companyId);
    return NextResponse.json({
      companyId: me.companyId,
      companyName: me.company.name,
      ...workspace,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Impossibile caricare i dati company" },
      { status: 500 }
    );
  }
}
