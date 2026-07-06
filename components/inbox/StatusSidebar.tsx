"use client";

import { STATUSES } from "@/lib/inboxData";
import type { Label, PartRequest, RequestStatus } from "@/lib/inboxTypes";

// COLONNA SINISTRA — stati (con contatori) + filtro etichette + ricerca.

interface Props {
  requests: PartRequest[];
  labels: Label[];
  activeStatus: RequestStatus | "all";
  activeLabelId: string | null;
  query: string;
  onSelectStatus: (s: RequestStatus | "all") => void;
  onSelectLabel: (id: string | null) => void;
  onQueryChange: (q: string) => void;
}

export function StatusSidebar({
  requests,
  labels,
  activeStatus,
  activeLabelId,
  query,
  onSelectStatus,
  onSelectLabel,
  onQueryChange,
}: Props) {
  const countByStatus = (s: RequestStatus) =>
    requests.filter((r) => r.status === s).length;
  const countByLabel = (id: string) =>
    requests.filter((r) => r.labelIds.includes(id)).length;

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-surface/60">
      {/* Ricerca */}
      <div className="p-3">
        <div className="relative">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="m20 20-3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Cerca richieste…"
            className="w-full rounded-lg border border-border bg-base py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {/* Voce "Tutte" */}
        <SidebarRow
          active={activeStatus === "all"}
          onClick={() => onSelectStatus("all")}
          color="#9fb0c3"
          label="Tutte le richieste"
          count={requests.length}
          bold
        />

        <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Stati
        </p>
        {STATUSES.map((s) => (
          <SidebarRow
            key={s.id}
            active={activeStatus === s.id}
            onClick={() => onSelectStatus(s.id)}
            color={s.color}
            label={s.label}
            count={countByStatus(s.id)}
            title={s.description}
          />
        ))}

        {/* Etichette custom */}
        <p className="px-2 pb-1 pt-5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Etichette
        </p>
        {labels.map((l) => (
          <SidebarRow
            key={l.id}
            active={activeLabelId === l.id}
            onClick={() =>
              onSelectLabel(activeLabelId === l.id ? null : l.id)
            }
            color={l.color}
            label={l.name}
            count={countByLabel(l.id)}
            square
          />
        ))}
        {activeLabelId && (
          <button
            onClick={() => onSelectLabel(null)}
            className="mt-1 w-full px-3 py-1 text-left text-xs text-brand hover:underline"
          >
            Rimuovi filtro etichetta
          </button>
        )}
      </nav>
    </aside>
  );
}

function SidebarRow({
  active,
  onClick,
  color,
  label,
  count,
  bold,
  square,
  title,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  label: string;
  count: number;
  bold?: boolean;
  square?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={[
        "group flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
        active
          ? "bg-brand-soft text-ink"
          : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
      ].join(" ")}
    >
      <span
        className={`h-2.5 w-2.5 shrink-0 ${square ? "rounded-[3px]" : "rounded-full"}`}
        style={{ backgroundColor: color }}
      />
      <span className={`flex-1 truncate ${bold ? "font-semibold" : ""}`}>
        {label}
      </span>
      <span
        className={[
          "min-w-[20px] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums",
          active ? "bg-brand/20 text-brand" : "bg-surface-2 text-ink-faint",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}
