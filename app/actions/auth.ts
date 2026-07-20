"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { slugifyCompanyName } from "@/lib/auth/user";

export type AuthActionState = {
  error?: string;
  ok?: boolean;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function registerCompanyAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!companyName || companyName.length < 2) {
    return { error: "Inserisci il nome della company." };
  }
  if (!name || name.length < 2) {
    return { error: "Inserisci il tuo nome." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Email non valida." };
  }
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Esiste già un account con questa email." };
  }

  let slug = slugifyCompanyName(companyName) || "company";
  const base = slug;
  let n = 1;
  while (await prisma.company.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }

  const passwordHash = await hashPassword(password);
  const company = await prisma.company.create({
    data: {
      name: companyName,
      slug,
      users: {
        create: {
          email,
          name,
          passwordHash,
          role: "OWNER",
        },
      },
    },
    include: { users: true },
  });

  const owner = company.users[0];
  await setSessionCookie({
    userId: owner.id,
    companyId: company.id,
    email: owner.email,
  });

  redirect("/company");
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Inserisci email e password." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      companyId: true,
    },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Credenziali non valide." };
  }

  await setSessionCookie({
    userId: user.id,
    companyId: user.companyId,
    email: user.email,
  });

  const next = String(formData.get("next") ?? "").trim();
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function updateCompanyAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const { getCurrentUser } = await import("@/lib/auth/user");
  const me = await getCurrentUser();
  if (!me) return { error: "Sessione scaduta. Accedi di nuovo." };
  if (me.role === "MEMBER") {
    return { error: "Non hai i permessi per modificare la company." };
  }

  const name = String(formData.get("companyName") ?? "").trim();
  if (!name || name.length < 2) {
    return { error: "Nome company non valido." };
  }

  await prisma.company.update({
    where: { id: me.companyId },
    data: { name },
  });

  revalidatePath("/company");
  return { ok: true };
}

export async function inviteMemberAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const me = await (await import("@/lib/auth/user")).getCurrentUser();
  if (!me) return { error: "Sessione scaduta. Accedi di nuovo." };
  if (me.role === "MEMBER") {
    return { error: "Solo owner/admin possono aggiungere utenti." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "MEMBER");
  const role =
    roleRaw === "ADMIN" || roleRaw === "OWNER" ? roleRaw : "MEMBER";

  if (!name || !email.includes("@") || password.length < 8) {
    return { error: "Compila nome, email e password (min. 8 caratteri)." };
  }
  if (role === "OWNER" && me.role !== "OWNER") {
    return { error: "Solo l'owner può creare altri owner." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email già registrata." };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      companyId: me.companyId,
    },
  });

  revalidatePath("/company");
  return { ok: true };
}
