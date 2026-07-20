"use client";

import { useActionState } from "react";
import {
  inviteMemberAction,
  updateCompanyAction,
  type AuthActionState,
} from "@/app/actions/auth";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function CompanyWorkspace({
  company,
  members,
  canManage,
}: {
  company: { id: string; name: string; slug: string; createdAt: string };
  members: Member[];
  canManage: boolean;
}) {
  const [companyState, companyAction, companyPending] = useActionState(
    updateCompanyAction,
    {} as AuthActionState
  );
  const [inviteState, inviteAction, invitePending] = useActionState(
    inviteMemberAction,
    {} as AuthActionState
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Company
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{company.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Workspace <span className="font-mono text-brand">{company.slug}</span> ·
          creato {company.createdAt}
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface/60 p-5">
        <h2 className="text-sm font-semibold text-ink">Dati company</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Nome visualizzato nel workspace e nelle comunicazioni.
        </p>
        <form action={companyAction} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            name="companyName"
            defaultValue={company.name}
            disabled={!canManage}
            className="min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
          />
          {canManage && (
            <button
              type="submit"
              disabled={companyPending}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              {companyPending ? "Salvataggio…" : "Salva"}
            </button>
          )}
        </form>
        {companyState.error && (
          <p className="mt-2 text-sm text-danger">{companyState.error}</p>
        )}
        {companyState.ok && (
          <p className="mt-2 text-sm text-ok">Company aggiornata.</p>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Utenti</h2>
            <p className="mt-1 text-xs text-ink-faint">
              {members.length}{" "}
              {members.length === 1 ? "membro" : "membri"} nel team
            </p>
          </div>
        </div>

        <ul className="mt-4 divide-y divide-border/70 rounded-xl border border-border bg-base/50">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{m.name}</p>
                <p className="truncate text-xs text-ink-faint">{m.email}</p>
              </div>
              <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                {ROLE_LABEL[m.role] ?? m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="rounded-2xl border border-border bg-surface/60 p-5">
          <h2 className="text-sm font-semibold text-ink">Aggiungi utente</h2>
          <p className="mt-1 text-xs text-ink-faint">
            Crea un accesso per un collega della stessa company.
          </p>
          <form action={inviteAction} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-ink-muted">
              Nome
              <input
                name="name"
                required
                className="mt-1 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="block text-sm text-ink-muted">
              Email
              <input
                name="email"
                type="email"
                required
                className="mt-1 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="block text-sm text-ink-muted">
              Password temporanea
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className="mt-1 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <label className="block text-sm text-ink-muted">
              Ruolo
              <select
                name="role"
                defaultValue="MEMBER"
                className="mt-1 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
                <option value="OWNER">Owner</option>
              </select>
            </label>
            <div className="sm:col-span-2">
              {inviteState.error && (
                <p className="mb-2 text-sm text-danger">{inviteState.error}</p>
              )}
              {inviteState.ok && (
                <p className="mb-2 text-sm text-ok">Utente aggiunto.</p>
              )}
              <button
                type="submit"
                disabled={invitePending}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
              >
                {invitePending ? "Creazione…" : "Aggiungi utente"}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
