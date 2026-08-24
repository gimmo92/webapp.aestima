"use client";

import type { ReactNode } from "react";
import { euro } from "@/lib/quote";
import type { SparePartProposal } from "@/lib/serviceChatTypes";
import { useI18n } from "@/lib/i18n";
import { sparePartSheetPath } from "@/lib/sparePartSheet";

function SheetLink({
  part,
  className,
  children,
}: {
  part: SparePartProposal;
  className: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <a
      href={sparePartSheetPath(part.code)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      title={t("spare.openSheet")}
    >
      {children}
    </a>
  );
}

/** Card strutturata per un ricambio proposto dall'agente. */
export function SparePartCard({
  part,
  compact = false,
  onRemove,
}: {
  part: SparePartProposal;
  compact?: boolean;
  onRemove?: (code: string) => void;
}) {
  const available = part.availability === "disponibile";
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface-2/50">
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(part.code)}
          className="absolute right-1.5 top-1.5 z-10 rounded-md p-0.5 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
          aria-label={t("spare.remove")}
          title={t("spare.remove")}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6 6 18"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
      <div
        className={[
          "flex items-center justify-between gap-3 border-b border-border",
          compact ? "px-3 py-2" : "px-4 py-2.5",
          onRemove ? "pr-8" : "",
        ].join(" ")}
      >
        <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-ink">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0 text-brand"
          >
            <path
              d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
          </svg>
          {compact ? (
            <SheetLink
              part={part}
              className="truncate text-left font-mono text-brand underline-offset-2 hover:underline"
            >
              {part.code}
            </SheetLink>
          ) : (
            <span className="truncate">{t("spare.identified")}</span>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full py-0.5 text-[11px] font-semibold",
              compact ? "px-2" : "px-2.5",
              available ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn",
            ].join(" ")}
          >
            <span
              className={[
                "h-1.5 w-1.5 rounded-full",
                available ? "bg-ok" : "bg-warn",
              ].join(" ")}
            />
            {available
              ? compact
                ? t("spare.availableShort")
                : t("spare.available")
              : `${t("spare.toOrder")}${part.leadTimeDays ? ` · ${part.leadTimeDays} gg` : ""}`}
          </span>
          {typeof part.confidence === "number" && (
            <span
              className={[
                "inline-flex items-center rounded-full py-0.5 font-semibold",
                compact ? "px-2 text-[11px]" : "px-2.5 text-[11px]",
                part.confidence >= 80
                  ? "bg-ok/15 text-ok"
                  : part.confidence >= 55
                    ? "bg-warn/15 text-warn"
                    : "border border-border bg-surface text-ink-muted",
              ].join(" ")}
              title={t("spare.confidence")}
              aria-label={`${t("spare.confidence")}: ${Math.round(part.confidence)}%`}
            >
              {Math.round(part.confidence)}%
            </span>
          )}
        </div>
      </div>
      <div
        className={
          compact ? "space-y-3 p-3" : "grid gap-3 p-4 sm:grid-cols-2"
        }
      >
        <div>
          <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {t("spare.description")}
          </p>
          <SheetLink
            part={part}
            className="text-left text-sm font-medium text-ink underline-offset-2 hover:text-brand hover:underline"
          >
            {part.description}
          </SheetLink>
        </div>
        <div className="space-y-2">
          {!compact && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {t("spare.code")}
              </span>
              <SheetLink
                part={part}
                className="font-mono text-sm font-semibold text-brand underline-offset-2 hover:underline"
              >
                {part.code}
              </SheetLink>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {t("spare.listPrice")}
            </span>
            <span className="text-sm font-semibold text-ink">
              {euro(part.price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Lista di card ricambi (thread o sidebar risultati). */
export function SparePartCardList({
  parts,
  compact = false,
  onRemove,
}: {
  parts: SparePartProposal[];
  compact?: boolean;
  onRemove?: (code: string) => void;
}) {
  return (
    <div className="space-y-2">
      {parts.map((part) => (
        <SparePartCard
          key={part.code}
          part={part}
          compact={compact}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
