"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  { href: "/", label: "Inbox" },
  { href: "/archivio", label: "Archivio" },
  { href: "/tecnici", label: "Tecnici" },
  { href: "/assistenza", label: "Assistenza AI" },
  { href: "/conversazioni", label: "Ticket" },
  { href: "/manuale", label: "Manuale" },
  { href: "/crea", label: "Crea offerta" },
  { href: "/company", label: "Company" },
] as const;

type MeInfo = {
  name: string;
  company: { name: string };
};

export function InboxTopBar({
  companyName,
  userName,
}: {
  companyName?: string;
  userName?: string;
} = {}) {
  const pathname = usePathname();
  const [me, setMe] = useState<MeInfo | null>(
    companyName || userName
      ? { name: userName ?? "", company: { name: companyName ?? "" } }
      : null
  );

  useEffect(() => {
    if (companyName || userName) return;
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.user) setMe(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [companyName, userName]);

  const displayCompany = companyName || me?.company.name;
  const displayUser = userName || me?.name;

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/70 px-5 py-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-5">
        <Logo />
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
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

      <div className="flex shrink-0 items-center gap-3">
        {(displayCompany || displayUser) && (
          <div className="hidden text-right sm:block">
            {displayCompany && (
              <p className="max-w-[160px] truncate text-xs font-semibold text-ink">
                {displayCompany}
              </p>
            )}
            {displayUser && (
              <p className="max-w-[160px] truncate text-[11px] text-ink-faint">
                {displayUser}
              </p>
            )}
          </div>
        )}
        {displayUser || displayCompany ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-border bg-base px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
            >
              Esci
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-strong"
          >
            Accedi
          </Link>
        )}
      </div>
    </header>
  );
}
