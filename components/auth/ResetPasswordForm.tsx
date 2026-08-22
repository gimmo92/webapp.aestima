"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  resetPasswordAction,
  type AuthActionState,
} from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

const initial: AuthActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);
  const { t } = useI18n();

  if (!token) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-8 text-center">
          <Logo className="justify-center" height={40} />
          <h1 className="mt-6 text-2xl font-bold text-ink">{t("auth.invalidLinkTitle")}</h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t("auth.invalidLinkBody")}
          </p>
        </div>
        <p className="text-center text-sm text-ink-faint">
          <Link href="/recupera-password" className="font-medium text-brand hover:underline">
            {t("auth.requestNewLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <Logo className="justify-center" height={40} />
        <h1 className="mt-6 text-2xl font-bold text-ink">{t("auth.newPasswordTitle")}</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t("auth.newPasswordSubtitle")}
        </p>
      </div>

      <form
        action={action}
        className="rounded-2xl border border-border bg-surface/70 p-6 shadow-xl shadow-black/20"
      >
        <input type="hidden" name="token" value={token} />

        <label className="block text-sm font-medium text-ink-muted">
          {t("auth.newPassword")}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder={t("auth.minChars")}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-ink-muted">
          {t("auth.confirmPassword")}
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1.5 w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            placeholder={t("auth.repeatPassword")}
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
          {pending ? t("auth.saving") : t("auth.setNewPassword")}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-faint">
        <Link href="/login" className="font-medium text-brand hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </div>
  );
}
