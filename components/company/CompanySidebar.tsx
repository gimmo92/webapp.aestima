"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const ITEMS = [
  {
    href: "/company/modifica",
    key: "company.edit",
    match: (path: string) =>
      path === "/company" ||
      path === "/company/modifica" ||
      path.startsWith("/company/modifica/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/company/utenti",
    key: "company.users",
    match: (path: string) => path === "/company/utenti" || path.startsWith("/company/utenti/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/company/clienti",
    key: "company.customers",
    match: (path: string) => path === "/company/clienti" || path.startsWith("/company/clienti/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 7h18v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8 7V5a4 4 0 0 1 8 0v2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/company/fornitori",
    key: "company.suppliers",
    match: (path: string) =>
      path === "/company/fornitori" || path.startsWith("/company/fornitori/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 7h11v10H3zM14 10h4l3 3v4h-7"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.5" cy="18.5" r="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
] as const;

export function CompanySidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-surface/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("company.section")}
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2" aria-label={t("company.navAria")}>
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "inline-flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-soft text-ink"
                  : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
              ].join(" ")}
            >
              {item.icon}
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
