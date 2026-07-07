"use client";

import type { ArchiveGap, ArchiveGapReport } from "@/lib/archiveGaps";
import { machineLabel } from "@/lib/archiveData";

interface Props {
  report: ArchiveGapReport;
  onSearch?: (query: string) => void;
}

export function ArchiveGapsSidebar({ report, onSearch }: Props) {
  const { priceGaps, dataGaps, total, machinesWithIssues } = report;
  const ok = total === 0;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/40 lg:w-80">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">Completezza ricambi</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              Lacune su dati e prezzi in anagrafica
            </p>
          </div>
          <span
            className={[
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
              ok ? "bg-ok/15 text-ok" : "bg-warn/15 text-warn",
            ].join(" ")}
          >
            {ok ? "OK" : total}
          </span>
        </div>
        {!ok && (
          <p className="mt-2 text-[11px] text-ink-muted">
            {machinesWithIssues} macchin{machinesWithIssues === 1 ? "a" : "e"} con
            segnalazioni
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {ok ? (
          <div className="rounded-xl border border-ok/30 bg-ok/5 p-4 text-center">
            <span className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-ok/15 text-ok">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M4 10.5 8 14.5 16 5.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-sm font-medium text-ink">Anagrafica completa</p>
            <p className="mt-1 text-[11px] text-ink-faint">
              Nessuna lacuna su prezzi o dati ricambi rilevata.
            </p>
          </div>
        ) : (
          <>
            <GapSection
              title="Prezzi mancanti"
              count={priceGaps.length}
              tone="price"
              gaps={priceGaps}
              onSearch={onSearch}
            />
            <GapSection
              title="Dati ricambio mancanti"
              count={dataGaps.length}
              tone="data"
              gaps={dataGaps}
              onSearch={onSearch}
            />
          </>
        )}
      </div>
    </aside>
  );
}

function GapSection({
  title,
  count,
  tone,
  gaps,
  onSearch,
}: {
  title: string;
  count: number;
  tone: "price" | "data";
  gaps: ArchiveGap[];
  onSearch?: (query: string) => void;
}) {
  if (count === 0) {
    return (
      <section>
        <SectionHeader title={title} count={0} tone={tone} />
        <p className="px-1 text-[11px] text-ink-faint">Nessuna segnalazione.</p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title={title} count={count} tone={tone} />
      <ul className="space-y-2">
        {gaps.map((gap) => (
          <li key={gap.id}>
            <button
              type="button"
              disabled={!onSearch || !gap.searchQuery}
              onClick={() => gap.searchQuery && onSearch?.(gap.searchQuery)}
              className={[
                "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                gap.severity === "error"
                  ? "border-warn/40 bg-warn/5 hover:bg-warn/10"
                  : gap.severity === "warning"
                    ? "border-border bg-base/60 hover:bg-surface-2/50"
                    : "border-border/70 bg-base/40 hover:bg-surface-2/40",
                onSearch && gap.searchQuery ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                <SeverityDot severity={gap.severity} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-ink">{gap.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                    {gap.detail}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-faint">
                    {machineLabel(gap.machineSerial)}
                    {gap.partCode ? ` · ${gap.partCode}` : ""}
                  </p>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SectionHeader({
  title,
  count,
  tone,
}: {
  title: string;
  count: number;
  tone: "price" | "data";
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2 px-1">
      <div className="flex items-center gap-1.5">
        <span
          className={[
            "flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold",
            tone === "price" ? "bg-warn/15 text-warn" : "bg-brand-soft text-brand",
          ].join(" ")}
        >
          {tone === "price" ? "€" : "i"}
        </span>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {title}
        </h3>
      </div>
      <span className="text-[10px] font-semibold tabular-nums text-ink-faint">
        {count}
      </span>
    </div>
  );
}

function SeverityDot({ severity }: { severity: ArchiveGap["severity"] }) {
  const color =
    severity === "error"
      ? "bg-warn"
      : severity === "warning"
        ? "bg-brand"
        : "bg-ink-faint";
  return <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${color}`} />;
}
