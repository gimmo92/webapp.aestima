"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  registerCompanyAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

const initial: AuthActionState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(
    registerCompanyAction,
    initial
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-2xl font-bold text-ink">Crea la tua company</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Registra l&apos;azienda e diventa owner del workspace aestima.
        </p>
      </div>

      <form
        action={action}
        className="space-y-4 rounded-2xl border border-border bg-surface/70 p-6 shadow-xl shadow-black/20"
      >
        <label className="block text-sm font-medium text-ink-muted">
          Nome company
          <input
            name="companyName"
            required
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="Es. Rossi Meccanica S.r.l."
          />
        </label>

        <label className="block text-sm font-medium text-ink-muted">
          Il tuo nome
          <input
            name="name"
            required
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="Mario Rossi"
          />
        </label>

        <label className="block text-sm font-medium text-ink-muted">
          Email lavoro
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="nome@azienda.it"
          />
        </label>

        <label className="block text-sm font-medium text-ink-muted">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="Minimo 8 caratteri"
          />
        </label>

        {state.error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? "Creazione…" : "Crea company e accedi"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-faint">
        Hai già un account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
