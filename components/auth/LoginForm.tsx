"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthActionState } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

const initial: AuthActionState = {};

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-2xl font-bold text-ink">Accedi alla company</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Gestisci inbox, ticket e archivio del tuo team.
        </p>
      </div>

      <form
        action={action}
        className="rounded-2xl border border-border bg-surface/70 p-6 shadow-xl shadow-black/20"
      >
        {nextPath ? (
          <input type="hidden" name="next" value={nextPath} />
        ) : null}

        <label className="block text-sm font-medium text-ink-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="nome@azienda.it"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink-muted">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder="••••••••"
          />
        </label>

        {state.error && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? "Accesso…" : "Accedi"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-faint">
        Non hai ancora una company?{" "}
        <Link href="/register" className="font-medium text-brand hover:underline">
          Registrati
        </Link>
      </p>
    </div>
  );
}
