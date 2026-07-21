"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import { logoutAction } from "@/app/actions/auth";

const NAV = [
  {
    href: "/assistenza",
    label: "Assistenza AI",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 8V4H8M12 8a4 4 0 1 0 4 4H8a4 4 0 0 0 4 4m0-8a4 4 0 0 1 4 4m-4 4v4h4M21 12h-1M4 12H3m16.364-7.364-.707.707M5.343 18.657l-.707.707m0-14.142.707.707m12.728 12.728.707.707"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/",
    label: "Email",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
    href: "/conversazioni",
    label: "Ticket",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 8v8M15 8v8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/archivio",
    label: "Archivio",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7.5A1.5 1.5 0 0 1 5.5 6h13A1.5 1.5 0 0 1 20 7.5V9H4V7.5ZM4 9v8.5A1.5 1.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5V9"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M9 13h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/manuale",
    label: "Manuale",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/crea",
    label: "Crea offerta",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 2v6h6M12 18v-6M9 15h6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/company",
    label: "Azienda",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-soft text-ink"
                    : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
                ].join(" ")}
              >
                {item.icon}
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
