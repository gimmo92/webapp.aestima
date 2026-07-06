import Link from "next/link";
import { Logo } from "./Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-base/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
        <Logo />
        <div className="flex items-center gap-5">
          <nav className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <span className="cursor-default transition-colors hover:text-ink">
              Prodotto
            </span>
            <span className="cursor-default transition-colors hover:text-ink">
              Come funziona
            </span>
            <span className="cursor-default transition-colors hover:text-ink">
              Contatti
            </span>
          </nav>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dashboard inbox
          </Link>
          <span className="hidden rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand sm:inline">
            Demo
          </span>
        </div>
      </div>
    </header>
  );
}
