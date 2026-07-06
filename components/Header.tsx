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
          <span className="rounded-full border border-brand/40 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            Demo commerciale
          </span>
        </div>
      </div>
    </header>
  );
}
