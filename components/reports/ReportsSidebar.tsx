"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const ITEMS = [
  {
    href: "/rapporti",
    key: "reports.list",
    match: (path: string) => path === "/rapporti",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 4.5H7.5A1.5 1.5 0 0 0 6 6v13a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 19V6a1.5 1.5 0 0 0-1.5-1.5H15"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect
          x="9"
          y="3"
          width="6"
          height="3.2"
          rx="1.1"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9.2 11h5.6M9.2 14.5h5.6M9.2 18h3.2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/rapporti/feedback",
    key: "reports.feedback",
    match: (path: string) => path.startsWith("/rapporti/feedback"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 14a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M8.5 9.5h7M8.5 12.5h4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export function ReportsSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-surface/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("reports.section")}
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2" aria-label={t("reports.navAria")}>
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
