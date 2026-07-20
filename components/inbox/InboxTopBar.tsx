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

const PUBLIC_PATHS = ["/assistenza", "/embed", "/login", "/register"];

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
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const [me, setMe] = useState<MeInfo | null>(
    companyName || userName
      ? { name: userName ?? "", company: { name: companyName ?? "" } }
      : null
  );
  const [loggedIn, setLoggedIn] = useState(
    Boolean(companyName || userName) || !isPublic
  );

  useEffect(() => {
    if (companyName || userName) {
      setLoggedIn(true);
      return;
    }
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.user) {
          setMe(data.user);
          setLoggedIn(true);
        } else if (isPublic) {
          setLoggedIn(false);
        }
      })
      .catch(() => {
        if (!cancelled && isPublic) setLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyName, userName, isPublic]);

  const displayCompany = companyName || me?.company.name;
  const displayUser = userName || me?.name;

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/70 px-5 py-3 backdrop-blur-md">
      <div className="flex min-w-0 flex-1 items-center gap-5">
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

      <div className="ml-auto flex shrink-0 items-center gap-3">
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
        {loggedIn ? (
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-base px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Logout
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Accedi
          </Link>
        )}
      </div>
    </header>
  );
}
