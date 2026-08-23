"use client";

import { euro } from "@/lib/quote";
import type { SparePartProposal } from "@/lib/serviceChatTypes";
import { useI18n } from "@/lib/i18n";

/** Card strutturata per un ricambio proposto dall'agente. */
export function SparePartCard({
  part,
  compact = false,
}: {
  part: SparePartProposal;
  compact?: boolean;
}) {
  const available = part.availability === "disponibile";
  const { t } = useI18n();

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-2/50">
      <div
        className={[
          "flex items-center justify-between gap-3 border-b border-border",
          compact ? "px-3 py-2" : "px-4 py-2.5",
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
          <span className="truncate">
            {compact ? part.code : t("spare.identified")}
          </span>
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
          <p className="text-sm font-medium text-ink">{part.description}</p>
        </div>
        <div className="space-y-2">
          {!compact && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {t("spare.code")}
              </span>
              <span className="font-mono text-sm font-semibold text-brand">
                {part.code}
              </span>
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
}: {
  parts: SparePartProposal[];
  compact?: boolean;
}) {
  return (
    <div className="space-y-2">
      {parts.map((part) => (
        <SparePartCard key={part.code} part={part} compact={compact} />
      ))}
    </div>
  );
}
