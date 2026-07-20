import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
    },
  });
}
