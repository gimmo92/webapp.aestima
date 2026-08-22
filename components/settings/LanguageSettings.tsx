"use client";

import { useI18n } from "@/lib/i18n";
import { LOCALES, type Locale } from "@/lib/i18n/locale";

export function LanguageSettings() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-ink">{t("language.title")}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t("language.subtitle")}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {LOCALES.map((code) => {
            const active = locale === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code as Locale)}
                className={[
                  "rounded-2xl border px-4 py-4 text-left transition-colors",
                  active
                    ? "border-brand/50 bg-brand-soft shadow-sm"
                    : "border-border bg-surface/60 hover:border-border-strong",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">
                    {code === "it"
                      ? t("language.italian")
                      : t("language.english")}
                  </span>
                  <span
                    className={[
                      "h-4 w-4 rounded-full border-2",
                      active
                        ? "border-brand bg-brand"
                        : "border-border bg-base",
                    ].join(" ")}
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-1 text-xs text-ink-faint">
                  {code === "it"
                    ? t("language.italianHint")
                    : t("language.englishHint")}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
