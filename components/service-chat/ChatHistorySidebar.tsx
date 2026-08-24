"use client";

import type { ConversationRecord } from "@/lib/conversationTypes";
import { useI18n } from "@/lib/i18n";

function conversationTitle(
  conversation: ConversationRecord,
  untitled: string
): string {
  const firstUser = conversation.messages.find((m) => m.role === "user");
  const raw = firstUser?.content?.trim() || conversation.lastMessagePreview;
  if (!raw) return untitled;
  const line = raw.split("\n")[0].trim();
  return line.length > 52 ? `${line.slice(0, 49).trim()}…` : line;
}

interface Props {
  conversations: ConversationRecord[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  disabled?: boolean;
}

/** Storico conversazioni della chat assistenza — lista, elimina, nuova. */
export function ChatHistorySidebar({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
  disabled = false,
}: Props) {
  const isNewActive = activeId === null;
  const { t } = useI18n();
  const untitled = t("history.untitled");

  return (
    <aside
      className="flex w-72 shrink-0 flex-col border-r border-border bg-surface"
      aria-label={t("history.aria")}
    >
      <div className="border-b border-border px-3 py-3">
        <p className="px-1 text-sm font-bold text-ink">{t("history.title")}</p>
        <p className="mt-0.5 px-1 text-[11px] text-ink-faint">
          {t("history.subtitle")}
        </p>
        <button
          type="button"
          onClick={onNew}
          disabled={disabled}
          className={[
            "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            isNewActive
              ? "bg-brand text-white shadow-lg shadow-brand/20"
              : "border border-border bg-base text-ink hover:border-brand/40 hover:text-brand",
          ].join(" ")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          {t("history.new")}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs leading-relaxed text-ink-faint">
            {t("history.empty")}
          </p>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conversation) => {
              const active = conversation.id === activeId;
              return (
                <li key={conversation.id}>
                  <div
                    className={[
                      "group flex items-start gap-1 rounded-xl pr-1 transition-colors",
                      active
                        ? "bg-brand-soft"
                        : "hover:bg-surface-2/80",
                    ].join(" ")}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                      disabled={disabled}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                          {conversationTitle(conversation, untitled)}
                        </span>
                        <span className="shrink-0 text-[10px] text-ink-faint">
                          {conversation.lastMessageLabel}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-ink-faint">
                        {conversation.lastMessagePreview}
                      </p>
                      {conversation.status === "risolto" && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-ok">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M20 6 9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          {t("history.resolved")}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete(conversation.id);
                      }}
                      title={t("history.delete")}
                      aria-label={`${t("history.delete")} ${conversationTitle(conversation, untitled)}`}
                      className="mt-2 mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
