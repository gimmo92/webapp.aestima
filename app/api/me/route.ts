import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { modulesFromSettings } from "@/lib/companyModules";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { settingsJson: true },
  });
  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      company: {
        ...user.company,
        modules: modulesFromSettings(company?.settingsJson),
      },
    },
  });
}
