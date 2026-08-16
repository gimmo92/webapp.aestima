"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordResetAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

const initial: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    initial
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Logo className="justify-center" height={40} />
        <h1 className="mt-6 text-2xl font-bold text-ink">Recupera password</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Inserisci l&apos;email del tuo account. Se è registrata, ti invieremo
          un link per sceglierne una nuova.
        </p>
      </div>

      <form
        action={action}
        className="rounded-2xl border border-border bg-surface/70 p-6 shadow-xl shadow-black/20"
      >
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

        {state.error && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && state.message && (
          <p className="mt-4 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">
            {state.message}
          </p>
        )}
        {state.resetUrl && (
          <p className="mt-3 break-all text-sm">
            <Link href={state.resetUrl} className="font-medium text-brand hover:underline">
              Apri il link di recupero
            </Link>
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? "Invio…" : "Invia link di recupero"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-faint">
        Torni indietro?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
