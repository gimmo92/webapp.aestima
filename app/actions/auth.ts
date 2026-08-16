"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  setSessionCookie,
} from "@/lib/auth/session";
import { slugifyCompanyName } from "@/lib/auth/user";
import {
  RESET_TOKEN_TTL_MS,
  appBaseUrl,
  createResetToken,
  hashResetToken,
  isLocalHost,
  sendPasswordResetEmail,
} from "@/lib/auth/passwordReset";

export type AuthActionState = {
  error?: string;
  ok?: boolean;
  message?: string;
  resetUrl?: string;
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
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/ticket");
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

  const pick = (key: string) => String(formData.get(key) ?? "").trim();
  const companyProfile = {
    vat: pick("vat"),
    pec: pick("pec"),
    phone: pick("phone"),
    email: pick("email"),
    address: pick("address"),
    city: pick("city"),
    website: pick("website"),
  };

  const current = await prisma.company.findUnique({
    where: { id: me.companyId },
    select: { settingsJson: true },
  });
  const prev =
    current?.settingsJson && typeof current.settingsJson === "object"
      ? (current.settingsJson as Record<string, unknown>)
      : {};

  await prisma.company.update({
    where: { id: me.companyId },
    data: {
      name,
      settingsJson: {
        ...prev,
        companyProfile,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/company");
  revalidatePath("/company/modifica");
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
  revalidatePath("/company/utenti");
  return { ok: true };
}

function parseManagedRole(
  raw: string,
  actorRole: "OWNER" | "ADMIN" | "MEMBER"
): "OWNER" | "ADMIN" | "MEMBER" | null {
  if (raw !== "ADMIN" && raw !== "OWNER" && raw !== "MEMBER") return "MEMBER";
  if (raw === "OWNER" && actorRole !== "OWNER") return null;
  return raw;
}

export async function updateMemberAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const me = await (await import("@/lib/auth/user")).getCurrentUser();
  if (!me) return { error: "Sessione scaduta. Accedi di nuovo." };
  if (me.role === "MEMBER") {
    return { error: "Solo owner/admin possono modificare gli utenti." };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  const requestedRole = parseManagedRole(
    String(formData.get("role") ?? "MEMBER"),
    me.role
  );
  if (!requestedRole) return { error: "Solo l'owner può assegnare il ruolo owner." };
  if (!userId || !name || !email.includes("@")) {
    return { error: "Compila nome e email validi." };
  }
  if (password && password.length < 8) {
    return { error: "La nuova password deve avere almeno 8 caratteri." };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, companyId: me.companyId },
  });
  if (!target) return { error: "Utente non trovato." };
  if (target.role === "OWNER" && me.role !== "OWNER") {
    return { error: "Non puoi modificare un owner." };
  }
  const role = target.id === me.id ? target.role : requestedRole;
  if (target.id === me.id && requestedRole !== target.role) {
    return { error: "Non puoi cambiare il tuo ruolo." };
  }
  if (target.role === "OWNER" && role !== "OWNER") {
    const owners = await prisma.user.count({
      where: { companyId: me.companyId, role: "OWNER" },
    });
    if (owners <= 1) {
      return { error: "Deve restare almeno un owner." };
    }
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, NOT: { id: target.id } },
    select: { id: true },
  });
  if (emailTaken) return { error: "Email già registrata." };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      name,
      email,
      role,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  revalidatePath("/company/utenti");
  return { ok: true };
}

export async function deleteMemberAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const me = await (await import("@/lib/auth/user")).getCurrentUser();
  if (!me) return { error: "Sessione scaduta. Accedi di nuovo." };
  if (me.role === "MEMBER") {
    return { error: "Solo owner/admin possono eliminare utenti." };
  }

  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return { error: "Utente non valido." };
  if (userId === me.id) return { error: "Non puoi eliminare il tuo account." };

  const target = await prisma.user.findFirst({
    where: { id: userId, companyId: me.companyId },
  });
  if (!target) return { error: "Utente non trovato." };
  if (target.role === "OWNER" && me.role !== "OWNER") {
    return { error: "Non puoi eliminare un owner." };
  }
  if (target.role === "OWNER") {
    const owners = await prisma.user.count({
      where: { companyId: me.companyId, role: "OWNER" },
    });
    if (owners <= 1) {
      return { error: "Deve restare almeno un owner." };
    }
  }

  await prisma.user.delete({ where: { id: target.id } });
  revalidatePath("/company/utenti");
  return { ok: true };
}

const RESET_OK_MESSAGE =
  "Se l'indirizzo è in anagrafica, riceverai a breve le istruzioni per reimpostare la password.";

export async function requestPasswordResetAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email || !email.includes("@")) {
    return { error: "Inserisci un'email valida." };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user) {
    return { ok: true, message: RESET_OK_MESSAGE };
  }

  const { token, tokenHash } = createResetToken();
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  const resetUrl = `${await appBaseUrl()}/recupera-password/nuova?token=${encodeURIComponent(token)}`;
  const emailResult = await sendPasswordResetEmail(user.email, resetUrl);
  if (emailResult.error) {
    return { error: "Invio email non riuscito. Riprova tra poco." };
  }

  if (!emailResult.sent && isLocalHost(resetUrl)) {
    return {
      ok: true,
      message: "Ambiente locale: usa il link qui sotto per scegliere la nuova password.",
      resetUrl,
    };
  }

  return { ok: true, message: RESET_OK_MESSAGE };
}

export async function resetPasswordAction(
  _prev: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!token) return { error: "Link non valido. Richiedine uno nuovo." };
  if (password.length < 8) {
    return { error: "La password deve avere almeno 8 caratteri." };
  }
  if (password !== confirm) {
    return { error: "Le password non coincidono." };
  }

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!row || row.expiresAt.getTime() < Date.now()) {
    if (row) await prisma.passwordResetToken.delete({ where: { id: row.id } });
    return { error: "Link non valido o scaduto. Richiedine uno nuovo." };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  redirect("/login?reset=1");
}
