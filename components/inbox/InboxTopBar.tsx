"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

// Barra superiore della dashboard: logo, navigazione tra le viste
// (Inbox / Pipeline) e link alla demo flusso.

const NAV = [
  { href: "/", label: "Inbox" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/archivio", label: "Archivio" },
] as const;

export function InboxTopBar() {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface/70 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-5">
        <Logo />
        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-ink"
                    : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Link
        href="/demo"
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-base px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
      >
        Demo flusso
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </header>
  );
}
