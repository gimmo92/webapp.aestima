"use client";

import type { KbFeedbackStatus } from "@/lib/serviceChatTypes";

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
  if (status === "updating") {
    return (
      <div className="mt-3 rounded-xl border border-brand/30 bg-brand-soft/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
          <div>
            <p className="text-sm font-medium text-ink">Aggiorno knowledge base…</p>
            <p className="text-xs text-ink-faint">
              Registro che la scheda {entryId} ha risolto un altro caso
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === "helpful") {
    return (
      <div className="mt-3 rounded-xl border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
        Grazie! Knowledge base aggiornata — la soluzione è ora più rilevante per
        casi futuri simili.
      </div>
    );
  }

  if (status === "not_helpful") {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface/80 px-4 py-3 text-sm text-ink-muted">
        Grazie per il feedback. Se il problema persiste, descrivi cosa non ha
        funzionato: un operatore seguirà la conversazione e ti aiuterà.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-border bg-base/80 px-4 py-3">
      <p className="mb-2.5 text-sm font-medium text-ink">
        Questa soluzione ti ha aiutato?
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
          Sì, ha risolto
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
          No, non ha aiutato
        </button>
      </div>
    </div>
  );
}
