"use client";

import { useActionState, useEffect, useState } from "react";
import {
  deleteMemberAction,
  inviteMemberAction,
  updateMemberAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Field, inputClass } from "./formFields";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  MEMBER: "Member",
};

export type CompanyMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export function CompanyUsersPanel({
  members,
  canManage,
  currentUserId,
  currentRole,
}: {
  members: CompanyMember[];
  canManage: boolean;
  currentUserId: string;
  currentRole: string;
}) {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"new" | CompanyMember | null>(null);

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      (ROLE_LABEL[m.role] ?? m.role).toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h1 className="text-sm font-semibold text-ink">Utenti</h1>
          <p className="text-xs text-ink-faint">
            {members.length} {members.length === 1 ? "membro" : "membri"} nel team
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca nome, email, ruolo…"
            className="w-56 rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          {canManage && (
            <button
              type="button"
              onClick={() => setModal("new")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Aggiungi utente
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="sticky top-0 bg-surface/90 text-[11px] uppercase tracking-wider text-ink-faint backdrop-blur">
            <tr>
              <th className="px-5 py-3 font-semibold">Nome</th>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Ruolo</th>
              <th className="px-5 py-3 font-semibold">Creato</th>
              {canManage && <th className="px-5 py-3 font-semibold">Azioni</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70">
            {filtered.map((m) => (
              <tr key={m.id} className="hover:bg-surface-2/40">
                <td className="px-5 py-3 font-medium text-ink">{m.name}</td>
                <td className="px-5 py-3 text-ink-muted">{m.email}</td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                </td>
                <td className="px-5 py-3 text-ink-faint">
                  {new Date(m.createdAt).toLocaleDateString("it-IT")}
                </td>
                {canManage && (
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setModal(m)}
                        className="text-xs font-medium text-brand hover:underline"
                      >
                        Modifica
                      </button>
                      {m.id !== currentUserId && (
                        <DeleteUserButton userId={m.id} name={m.name} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-ink-faint">
            Nessun utente corrisponde alla ricerca.
          </p>
        )}
      </div>

      {modal && (
        <UserFormModal
          member={modal === "new" ? null : modal}
          currentRole={currentRole}
          currentUserId={currentUserId}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function DeleteUserButton({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState(
    deleteMemberAction,
    {} as AuthActionState
  );

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Eliminare ${name} dal team?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        disabled={pending}
        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
      >
        {pending ? "Elimino…" : "Elimina"}
      </button>
      {state.error && (
        <span className="ml-2 text-xs text-danger">{state.error}</span>
      )}
    </form>
  );
}

function UserFormModal({
  member,
  currentRole,
  currentUserId,
  onClose,
}: {
  member: CompanyMember | null;
  currentRole: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const isNew = !member;
  const actionFn = isNew ? inviteMemberAction : updateMemberAction;
  const [state, action, pending] = useActionState(actionFn, {} as AuthActionState);
  const canAssignOwner = currentRole === "OWNER";
  const lockRole = Boolean(member && member.id === currentUserId);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-bold text-ink">
            {isNew ? "Aggiungi utente" : "Modifica utente"}
          </h3>
          <button type="button" onClick={onClose} className="text-ink-faint hover:text-ink">
            Chiudi
          </button>
        </div>
        <form action={action} className="grid gap-3 p-5">
          {member && <input type="hidden" name="userId" value={member.id} />}
          <Field label="Nome">
            <input
              name="name"
              required
              defaultValue={member?.name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              required
              defaultValue={member?.email ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label={isNew ? "Password temporanea" : "Nuova password (opzionale)"}>
            <input
              name="password"
              type="password"
              required={isNew}
              minLength={isNew ? 8 : undefined}
              className={inputClass}
              placeholder={isNew ? "Minimo 8 caratteri" : "Lascia vuoto per non cambiare"}
            />
          </Field>
          {lockRole && member && (
            <input type="hidden" name="role" value={member.role} />
          )}
          <Field label="Ruolo">
            <select
              name="role"
              defaultValue={member?.role ?? "MEMBER"}
              disabled={lockRole}
              className={inputClass}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              {canAssignOwner && <option value="OWNER">Owner</option>}
            </select>
          </Field>
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:text-ink"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              {pending ? "Salvataggio…" : isNew ? "Aggiungi" : "Salva"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
