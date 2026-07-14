"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";

// Barra superiore condivisa: logo + navigazione principale.

const NAV = [
  { href: "/", label: "Inbox" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/storico", label: "Storico offerte" },
  { href: "/archivio", label: "Archivio" },
  { href: "/fornitori", label: "Fornitori" },
  { href: "/tecnici", label: "Tecnici" },
  { href: "/assistenza", label: "Assistenza AI" },
  { href: "/conversazioni", label: "Conversazioni" },
  { href: "/manuale", label: "Manuale" },
  { href: "/embed", label: "Embed" },
  { href: "/ticket", label: "Ticket" },
  { href: "/crea", label: "Crea offerta" },
] as const;

export function InboxTopBar() {
  const pathname = usePathname();

  return (
    <header className="flex shrink-0 items-center border-b border-border bg-surface/70 px-5 py-3 backdrop-blur-md">
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
    </header>
  );
}
