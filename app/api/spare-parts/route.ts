import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/prisma";
import { mapSparePart } from "@/lib/workspace/mappers";
import { cleanupDiscontinuedSpareParts } from "@/lib/discontinuedSparePart";
import { fillMissingLeadTimes } from "@/lib/fillMissingLeadTimes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    await cleanupDiscontinuedSpareParts(me.companyId);
    await fillMissingLeadTimes(me.companyId);
    const rows = await prisma.sparePart.findMany({
      where: { companyId: me.companyId },
      orderBy: { codice: "asc" },
    });
    return NextResponse.json(
      { spareParts: rows.map(mapSparePart) },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    console.error("spare-parts GET fail", err);
    return NextResponse.json(
      { error: "Impossibile caricare i ricambi" },
      { status: 500 }
    );
  }
}
