"use client";

import { KbMatchBanner } from "./KbMatchBanner";
import { KbSolutionFeedback } from "./KbSolutionFeedback";
import { SparePartCardList } from "./SparePartCard";
import { TicketBanner } from "./TicketBanner";
import type {
  DisplayMessage,
  KbFeedbackStatus,
  KbMatchPreview,
  ServiceTicket,
  SparePartProposal,
} from "@/lib/serviceChatTypes";
import { useI18n } from "@/lib/i18n";

export type ChatResultSource = Pick<
  DisplayMessage,
  "id" | "spareParts" | "kbMatch" | "kbFeedback" | "ticket"
>;

export function collectChatResults(messages: ChatResultSource[]) {
  const sparePartsMap = new Map<string, SparePartProposal>();
  let kbMatch: KbMatchPreview | undefined;
  let kbFeedback: KbFeedbackStatus | undefined;
  let kbMessageId: string | undefined;
  let ticket: ServiceTicket | undefined;

  for (const m of messages) {
    for (const part of m.spareParts ?? []) {
      const prev = sparePartsMap.get(part.code);
      if (!prev) {
        sparePartsMap.set(part.code, part);
        continue;
      }
      sparePartsMap.set(part.code, {
        ...prev,
        ...part,
        confidence:
          Math.max(prev.confidence ?? 0, part.confidence ?? 0) ||
          prev.confidence ||
          part.confidence,
      });
    }
    if (m.kbMatch) {
      kbMatch = m.kbMatch;
      kbFeedback = m.kbFeedback;
      kbMessageId = m.id;
    }
    if (m.ticket) ticket = m.ticket;
  }

  const spareParts = [...sparePartsMap.values()].sort(
    (a, b) => (b.confidence ?? 0) - (a.confidence ?? 0)
  );
  return {
    spareParts,
    kbMatch,
    kbFeedback,
    kbMessageId,
    ticket,
    hasResults: spareParts.length > 0 || Boolean(kbMatch) || Boolean(ticket),
  };
}

interface Props {
  messages: ChatResultSource[];
  searching?: boolean;
  onKbFeedback?: (helpful: boolean) => void;
  /** Overlay a destra (embed / viewport stretta) invece della colonna fissa. */
  overlay?: boolean;
  onClose?: () => void;
  onRemoveSparePart?: (code: string) => void;
  onOpenSparePart?: (part: SparePartProposal) => void;
}

/** Pannello risultati chat: ricambi, KB e ticket — fuori dal thread. */
export function ChatResultsSidebar({
  messages,
  searching = false,
  onKbFeedback,
  overlay = false,
  onClose,
  onRemoveSparePart,
  onOpenSparePart,
}: Props) {
  const { t } = useI18n();
  const { spareParts, kbMatch, kbFeedback, ticket, hasResults } =
    collectChatResults(messages);
  const resultCount =
    spareParts.length + (kbMatch ? 1 : 0) + (ticket ? 1 : 0);

  return (
    <aside
      className={[
        "flex min-h-0 shrink-0 flex-col border-border bg-surface",
        overlay
          ? "absolute inset-y-0 right-0 z-20 w-[min(22rem,92%)] border-l shadow-2xl shadow-black/20"
          : "w-[min(24rem,38%)] border-l",
      ].join(" ")}
      aria-label={t("results.aria")}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-ink">{t("results.title")}</h2>
            {resultCount > 0 && (
              <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-brand">
                {resultCount}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-ink-faint">
            {t("results.subtitle")}
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label={t("results.close")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {searching && (
          <div className="rounded-xl border border-brand/30 bg-brand-soft/50 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              <div>
                <p className="text-sm font-medium text-ink">{t("results.searching")}</p>
                <p className="text-xs text-ink-faint">
                  {t("results.searchingHint")}
                </p>
              </div>
            </div>
          </div>
        )}

        {!hasResults && !searching && <EmptyResults />}

        {ticket && <TicketBanner ticket={ticket} />}

        {kbMatch && (
          <div className="space-y-3">
            <KbMatchBanner match={kbMatch} />
            {kbFeedback && onKbFeedback && (
              <KbSolutionFeedback
                status={kbFeedback}
                entryId={kbMatch.entryId}
                onHelpful={() => onKbFeedback(true)}
                onNotHelpful={() => onKbFeedback(false)}
                disabled={kbFeedback !== "pending"}
              />
            )}
          </div>
        )}

        {spareParts.length > 0 && (
          <section>
            <p className="mb-2 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {t("results.spareSection")}
            </p>
            <SparePartCardList
              parts={spareParts}
              compact
              onRemove={onRemoveSparePart}
              onOpen={onOpenSparePart}
            />
          </section>
        )}
      </div>
    </aside>
  );
}

function EmptyResults() {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-dashed border-border bg-base/50 px-4 py-8 text-center">
      <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-faint">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      </span>
      <p className="text-sm font-medium text-ink">{t("results.emptyTitle")}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-ink-faint">
        {t("results.emptyBody")}
      </p>
    </div>
  );
}
