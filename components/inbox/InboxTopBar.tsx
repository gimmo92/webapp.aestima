import Link from "next/link";
import { Logo } from "@/components/Logo";

// Barra superiore della dashboard: logo, claim ricorrente, link alla demo flusso.

export function InboxTopBar() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border bg-surface/70 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <Logo />
        <span className="hidden text-sm text-ink-faint sm:inline">
          Inbox ricambi after-sales
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="hidden items-center gap-2 rounded-full border border-border bg-surface-2/60 px-3 py-1 text-xs text-ink-muted md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          aestima prepara, l&apos;operatore approva e invia
        </span>
        <Link
          href="/demo"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-base px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-brand/50 hover:text-ink"
        >
          Demo flusso
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
