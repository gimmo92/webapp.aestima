"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  MOCK_OPEN_QUOTES,
  addPartToMockQuote,
  quoteHasPart,
  type MockOpenQuote,
} from "@/lib/mockOpenQuotes";

export function AddToOfferMenu({
  partCode,
}: {
  partCode: string;
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const [justAdded, setJustAdded] = useState<MockOpenQuote | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handlePick = (quote: MockOpenQuote) => {
    addPartToMockQuote(quote.id, partCode);
    setTick((n) => n + 1);
    setJustAdded(quote);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand"
      >
        {t("spare.addToOffer")}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className={open ? "rotate-180" : ""}
        >
          <path
            d="m6 9 6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={t("spare.pickOffer")}
          className="absolute left-0 top-full z-20 mt-2 w-[min(22rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-border bg-base shadow-xl shadow-black/10"
        >
          <li className="border-b border-border bg-surface-2/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {t("spare.pickOffer")}
          </li>
          {MOCK_OPEN_QUOTES.map((quote) => {
            const added = tick >= 0 && quoteHasPart(quote.id, partCode);
            return (
              <li key={quote.id} role="option" aria-selected={added}>
                <button
                  type="button"
                  onClick={() => handlePick(quote)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-brand-soft/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-xs font-semibold text-brand">
                      {quote.number}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-medium text-ink">
                      {quote.company}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-ink-muted">
                      {quote.title}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                    {added ? t("spare.alreadyInOffer") : t("spare.offerDraft")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {justAdded && (
        <p className="mt-2 text-xs font-medium text-ok">
          {t("spare.addedToOffer", { number: justAdded.number })}
        </p>
      )}
    </div>
  );
}
