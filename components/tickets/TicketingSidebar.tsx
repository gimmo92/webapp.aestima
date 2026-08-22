"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";

const ITEMS = [
  {
    href: "/ticket",
    key: "tickets.dashboard",
    match: (path: string) => path === "/ticket",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/ticket/lista",
    key: "tickets.list",
    match: (path: string) =>
      path === "/ticket/lista" || path.startsWith("/ticket/lista/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/ticket/coda",
    key: "tickets.queue",
    match: (path: string) => path === "/ticket/coda" || path.startsWith("/ticket/coda/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h5v12H4zM10 6h5v12h-5zM16 6h4v12h-4z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/ticket/inbox",
    key: "tickets.inbox",
    match: (path: string) => path === "/ticket/inbox" || path.startsWith("/ticket/inbox/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="m3.5 7.5 8.5 6 8.5-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/ticket/chat",
    key: "tickets.liveChat",
    match: (path: string) =>
      path === "/ticket/chat" ||
      path.startsWith("/ticket/chat/") ||
      path === "/conversazioni" ||
      path.startsWith("/conversazioni/"),
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
] as const;

export function TicketingSidebar() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-surface/60">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.section")}
        </p>
      </div>
      <nav className="flex flex-col gap-0.5 p-2" aria-label={t("tickets.navAria")}>
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
