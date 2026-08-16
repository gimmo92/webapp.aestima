"use client";

import { useActionState } from "react";
import {
  updateCompanyAction,
  type AuthActionState,
} from "@/app/actions/auth";
import type { CompanyProfile } from "@/lib/companyProfile";
import { Field, inputClass } from "./formFields";

export function CompanySettingsForm({
  company,
  profile,
  canManage,
}: {
  company: { name: string; slug: string; createdAt: string };
  profile: CompanyProfile;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    updateCompanyAction,
    {} as AuthActionState
  );

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          Azienda
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink">{company.name}</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Workspace <span className="font-mono text-brand">{company.slug}</span> ·
          creato {company.createdAt}
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-surface/60 p-5">
        <h2 className="text-sm font-semibold text-ink">Dati aziendali</h2>
        <p className="mt-1 text-xs text-ink-faint">
          Anagrafica usata nel workspace e nelle comunicazioni.
        </p>
        <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Ragione sociale">
            <input
              name="companyName"
              defaultValue={company.name}
              disabled={!canManage}
              required
              className={inputClass}
            />
          </Field>
          <Field label="Partita IVA">
            <input
              name="vat"
              defaultValue={profile.vat ?? ""}
              disabled={!canManage}
              className={inputClass}
              placeholder="IT01234567890"
            />
          </Field>
          <Field label="Email">
            <input
              name="email"
              type="email"
              defaultValue={profile.email ?? ""}
              disabled={!canManage}
              className={inputClass}
              placeholder="info@azienda.it"
            />
          </Field>
          <Field label="PEC">
            <input
              name="pec"
              type="email"
              defaultValue={profile.pec ?? ""}
              disabled={!canManage}
              className={inputClass}
              placeholder="azienda@pec.it"
            />
          </Field>
          <Field label="Telefono">
            <input
              name="phone"
              defaultValue={profile.phone ?? ""}
              disabled={!canManage}
              className={inputClass}
              placeholder="+39 02 1234567"
            />
          </Field>
          <Field label="Sito web">
            <input
              name="website"
              defaultValue={profile.website ?? ""}
              disabled={!canManage}
              className={inputClass}
              placeholder="https://www.azienda.it"
            />
          </Field>
          <Field label="Città">
            <input
              name="city"
              defaultValue={profile.city ?? ""}
              disabled={!canManage}
              className={inputClass}
            />
          </Field>
          <Field label="Indirizzo">
            <input
              name="address"
              defaultValue={profile.address ?? ""}
              disabled={!canManage}
              className={inputClass}
            />
          </Field>
          {canManage && (
            <div className="sm:col-span-2">
              {state.error && (
                <p className="mb-2 text-sm text-danger">{state.error}</p>
              )}
              {state.ok && (
                <p className="mb-2 text-sm text-ok">Azienda aggiornata.</p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
              >
                {pending ? "Salvataggio…" : "Salva modifiche"}
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
