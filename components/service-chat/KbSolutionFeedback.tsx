"use client";

import type { KbFeedbackStatus } from "@/lib/serviceChatTypes";
import { useI18n } from "@/lib/i18n";

interface Props {
  status: KbFeedbackStatus;
  entryId: string;
  onHelpful: () => void;
  onNotHelpful: () => void;
  disabled?: boolean;
}

export function KbSolutionFeedback({
  status,
  entryId,
  onHelpful,
  onNotHelpful,
  disabled,
}: Props) {
  const { t } = useI18n();
  if (status === "updating") {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand-soft/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          <div>
            <p className="text-sm font-medium text-ink">{t("kb.updating")}</p>
            <p className="text-xs text-ink-faint">
              {t("kb.updatingHint", { id: entryId })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "helpful") {
    return (
      <div className="rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
        {t("kb.thanks")}
      </div>
    );
  }

  if (status === "not_helpful") {
    return (
      <div className="rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-ink-muted">
        {t("kb.notHelpful")}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-base/80 px-4 py-3">
      <p className="mb-2.5 text-sm font-medium text-ink">
        {t("kb.didItHelp")}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onHelpful}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ok/15 px-3 py-2 text-sm font-semibold text-ok transition-colors hover:bg-ok/25 disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 10v12M7 10l-4-4V4a2 2 0 0 1 2-2h2l4 4 8-1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6l-4 4v-4H9a2 2 0 0 1-2-2v-2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {t("kb.yes")}
        </button>
        <button
          type="button"
          onClick={onNotHelpful}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M17 14V2M17 14l4 4v6a2 2 0 0 1-2 2h-2l-4-4H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h6l4-4v4Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          {t("kb.no")}
        </button>
      </div>
    </div>
  );
}
