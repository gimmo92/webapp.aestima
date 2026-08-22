export const LOCALES = ["it", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "it";
export const LOCALE_STORAGE_KEY = "aftercore:locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return value === "it" || value === "en";
}

export function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isLocale(raw) ? raw : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function dateLocale(locale: Locale): string {
  return locale === "en" ? "en-GB" : "it-IT";
}
