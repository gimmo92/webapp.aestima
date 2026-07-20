import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { applyWorkspaceMutation } from "@/lib/workspace/mutate";

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  let body: { action?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON non valido" }, { status: 400 });
  }

  if (!body.action) {
    return NextResponse.json({ error: "action richiesta" }, { status: 400 });
  }

  try {
    const result = await applyWorkspaceMutation(me.companyId, {
      action: body.action,
      payload: (body.payload ?? {}) as Record<string, unknown>,
    });
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Errore nel salvataggio su Supabase" },
      { status: 500 }
    );
  }
}
