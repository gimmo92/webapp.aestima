"use client";

import type { Label, PartRequest } from "@/lib/inboxTypes";
import { LabelChip } from "./LabelChip";
import { StatusDot } from "./StatusPill";

// COLONNA CENTRALE — lista richieste (stile inbox email) con tab.

interface Props {
  requests: PartRequest[];
  labels: Label[];
  selectedId: string | null;
  tab: "primarie" | "altre";
  onSelect: (id: string) => void;
  onTabChange: (tab: "primarie" | "altre") => void;
  primaryCount: number;
  otherCount: number;
}

/** Prime righe del corpo, come anteprima testo. */
function preview(body: string): string {
  return body.replace(/\s+/g, " ").trim();
}

export function RequestList({
  requests,
  labels,
  selectedId,
  tab,
  onSelect,
  onTabChange,
  primaryCount,
  otherCount,
}: Props) {
  const labelById = (id: string) => labels.find((l) => l.id === id);

  return (
    <section className="flex h-full w-full min-w-0 flex-col border-r border-border bg-base md:w-[380px] md:shrink-0">
      {/* Header + tab */}
      <div className="border-b border-border px-4 pt-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Richieste ricambi</h2>
          <span className="text-xs text-ink-faint">{requests.length} in vista</span>
        </div>
        <div className="mt-2 flex gap-4">
          <TabButton
            active={tab === "primarie"}
            onClick={() => onTabChange("primarie")}
            label="Primarie"
            count={primaryCount}
          />
          <TabButton
            active={tab === "altre"}
            onClick={() => onTabChange("altre")}
            label="Altre"
            count={otherCount}
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-faint">
            Nessuna richiesta con questi filtri.
          </div>
        ) : (
          requests.map((r) => {
            const selected = r.id === selectedId;
            return (
              <button
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={[
                  "flex w-full flex-col gap-1 border-b border-border/60 px-4 py-3 text-left transition-colors",
                  selected
                    ? "bg-brand-soft"
                    : "hover:bg-surface/70",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <StatusDot status={r.status} />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                    {r.company}
                  </span>
                  {r.attachments && r.attachments.length > 0 && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-label="Allegato" role="img" className="shrink-0 text-ink-faint">
                      <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 18.4a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span className="shrink-0 text-[11px] text-ink-faint">
                    {r.receivedLabel}
                  </span>
                </div>
                <p className="truncate text-sm text-ink-muted">{r.subject}</p>
                <p className="truncate text-xs text-ink-faint">
                  {preview(r.body)}
                </p>
                {r.labelIds.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.labelIds.map((id) => {
                      const l = labelById(id);
                      return l ? <LabelChip key={id} label={l} /> : null;
                    })}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "relative flex items-center gap-1.5 pb-2 text-sm font-medium transition-colors",
        active ? "text-ink" : "text-ink-faint hover:text-ink-muted",
      ].join(" ")}
    >
      {label}
      <span className="text-[11px] text-ink-faint">{count}</span>
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
      )}
    </button>
  );
}
