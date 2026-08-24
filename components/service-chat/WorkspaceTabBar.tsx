"use client";

import { useI18n } from "@/lib/i18n";

export type WorkspaceTab = {
  id: string;
  title: string;
  closable?: boolean;
};

/** Tab interne all'app (non schede del browser). */
export function WorkspaceTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
}: {
  tabs: WorkspaceTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className="flex shrink-0 items-end gap-0.5 overflow-x-auto border-b border-border bg-surface-2/60 px-2 pt-2"
      role="tablist"
      aria-label={t("spare.workspaceTabs")}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <div
            key={tab.id}
            className={[
              "group flex max-w-[16rem] shrink-0 items-center rounded-t-lg border border-b-0",
              active
                ? "border-border bg-base text-ink"
                : "border-transparent bg-transparent text-ink-muted hover:bg-surface/80 hover:text-ink",
            ].join(" ")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              id={`workspace-tab-${tab.id}`}
              onClick={() => onSelect(tab.id)}
              className="min-w-0 truncate px-3 py-1.5 text-xs font-semibold"
              title={tab.title}
            >
              {tab.title}
            </button>
            {tab.closable && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className="mr-1 rounded p-0.5 text-ink-faint opacity-70 hover:bg-surface-2 hover:text-ink group-hover:opacity-100"
                aria-label={t("spare.closeTab")}
                title={t("spare.closeTab")}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
