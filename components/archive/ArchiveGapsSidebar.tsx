"use client";

import { useEffect, useId, useState } from "react";
import type { ArchiveGap, ArchiveGapReport, GapAction } from "@/lib/archiveGaps";
import { machineLabel } from "@/lib/archiveData";
import { useI18n } from "@/lib/i18n";

export type GapUpdatePayload =
  | {
      kind: "set_codice";
      fileId: string;
      code: string;
      applyToAll: boolean;
    }
  | {
      kind: "set_price";
      partCode: string;
      price: number;
    };

interface Props {
  report: ArchiveGapReport;
  onSearch?: (query: string) => void;
  onUpdateGap?: (payload: GapUpdatePayload) => void;
}

export function ArchiveGapsSidebar({ report, onSearch, onUpdateGap }: Props) {
  const { t } = useI18n();
  const { priceGaps, dataGaps, total, machinesWithIssues } = report;
  const ok = total === 0;
  const [editing, setEditing] = useState<ArchiveGap | null>(null);

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface/40 lg:w-80">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-ink">{t("archive.gapsTitle")}</p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              {t("archive.gapsSubtitle")}
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
            {t(
              machinesWithIssues === 1
                ? "archive.gapsMachinesOne"
                : "archive.gapsMachinesMany",
              { n: machinesWithIssues }
            )}
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
            <p className="text-sm font-medium text-ink">{t("archive.gapsComplete")}</p>
            <p className="mt-1 text-[11px] text-ink-faint">
              {t("archive.gapsCompleteHint")}
            </p>
          </div>
        ) : (
          <>
            <GapSection
              title={t("archive.gapsMissingPrices")}
              count={priceGaps.length}
              tone="price"
              gaps={priceGaps}
              onSearch={onSearch}
              onUpdate={(gap) => setEditing(gap)}
            />
            <GapSection
              title={t("archive.gapsMissingData")}
              count={dataGaps.length}
              tone="data"
              gaps={dataGaps}
              onSearch={onSearch}
              onUpdate={(gap) => setEditing(gap)}
            />
          </>
        )}
      </div>

      {editing && (
        <GapUpdateModal
          gap={editing}
          onClose={() => setEditing(null)}
          onSearch={onSearch}
          onSubmit={(payload) => {
            onUpdateGap?.(payload);
            setEditing(null);
          }}
        />
      )}
    </aside>
  );
}

function GapSection({
  title,
  count,
  tone,
  gaps,
  onSearch,
  onUpdate,
}: {
  title: string;
  count: number;
  tone: "price" | "data";
  gaps: ArchiveGap[];
  onSearch?: (query: string) => void;
  onUpdate: (gap: ArchiveGap) => void;
}) {
  const { t } = useI18n();
  if (count === 0) {
    return (
      <section>
        <SectionHeader title={title} count={0} tone={tone} />
        <p className="px-1 text-[11px] text-ink-faint">{t("archive.gapsNone")}</p>
      </section>
    );
  }

  return (
    <section>
      <SectionHeader title={title} count={count} tone={tone} />
      <ul className="space-y-2">
        {gaps.map((gap) => (
          <li key={gap.id}>
            <div
              className={[
                "rounded-xl border px-3 py-2.5",
                gap.severity === "error"
                  ? "border-warn/40 bg-warn/5"
                  : gap.severity === "warning"
                    ? "border-border bg-base/60"
                    : "border-border/70 bg-base/40",
              ].join(" ")}
            >
              <div className="flex items-start gap-2">
                <SeverityDot severity={gap.severity} />
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    disabled={!onSearch || !gap.searchQuery}
                    onClick={() => gap.searchQuery && onSearch?.(gap.searchQuery)}
                    className={[
                      "w-full text-left",
                      onSearch && gap.searchQuery
                        ? "cursor-pointer hover:opacity-90"
                        : "cursor-default",
                    ].join(" ")}
                  >
                    <p className="text-xs font-semibold text-ink">{gap.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                      {gap.detail}
                    </p>
                    <p className="mt-1 text-[10px] text-ink-faint">
                      {machineLabel(
                        gap.machineSerial === "—" ? null : gap.machineSerial
                      )}
                      {gap.partCode ? ` · ${gap.partCode}` : ""}
                    </p>
                  </button>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => onUpdate(gap)}
                      className="inline-flex items-center gap-1 rounded-lg border border-brand/40 bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand transition-colors hover:bg-brand/20"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path
                          d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                      {t("archive.gapsUpdate")}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GapUpdateModal({
  gap,
  onClose,
  onSearch,
  onSubmit,
}: {
  gap: ArchiveGap;
  onClose: () => void;
  onSearch?: (query: string) => void;
  onSubmit: (payload: GapUpdatePayload) => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const action: GapAction = gap.action ?? "search";
  const [code, setCode] = useState(gap.partCode ?? "");
  const [price, setPrice] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);
  const [askAll, setAskAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submitCodice = (all: boolean) => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError(t("archive.gapEnterCode"));
      return;
    }
    if (!gap.fileId) {
      setError(t("archive.gapDocNotFound"));
      return;
    }
    onSubmit({
      kind: "set_codice",
      fileId: gap.fileId,
      code: trimmed,
      applyToAll: all,
    });
  };

  const submitPrice = () => {
    const value = Number(price.replace(",", "."));
    if (!gap.partCode || !Number.isFinite(value) || value <= 0) {
      setError(t("archive.gapInvalidPrice"));
      return;
    }
    onSubmit({ kind: "set_price", partCode: gap.partCode, price: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-base p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p id={titleId} className="text-sm font-semibold text-ink">
              {t("archive.gapUpdateTitle", { title: gap.title })}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">{gap.detail}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-ink-faint hover:text-ink"
          >
            {t("common.close")}
          </button>
        </div>

        {action === "set_codice" && !askAll && (
          <div className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {t("archive.gapPartCode")}
            </label>
            <input
              autoFocus
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="es. VLM-400-009/2"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {error && <p className="text-[11px] text-warn">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!code.trim()) {
                    setError(t("archive.gapEnterCode"));
                    return;
                  }
                  setAskAll(true);
                  setError(null);
                }}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                {t("archive.gapContinue")}
              </button>
            </div>
          </div>
        )}

        {action === "set_codice" && askAll && (
          <div className="space-y-3">
            <p className="text-sm text-ink">
              {t("archive.gapCodeEntered")}{" "}
              <span className="font-semibold text-brand">{code.trim()}</span>
            </p>
            <p className="text-sm text-ink-muted">
              {t("archive.gapUpdateAllQ")}
            </p>
            {error && <p className="text-[11px] text-warn">{error}</p>}
            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="mt-1"
              />
              <span>
                {t("archive.gapUpdateAllDocs")}
                <span className="mt-0.5 block text-[11px] text-ink-faint">
                  {t("archive.gapUpdateAllHint")}
                </span>
              </span>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setAskAll(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
              >
                {t("common.back")}
              </button>
              <button
                type="button"
                onClick={() => submitCodice(applyToAll)}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                {t("archive.gapConfirmUpdate")}
              </button>
            </div>
          </div>
        )}

        {action === "set_price" && (
          <div className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {t("archive.gapUnitPrice", { code: gap.partCode ?? "" })}
            </label>
            <input
              autoFocus
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                setError(null);
              }}
              placeholder="es. 69.70"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
            {error && <p className="text-[11px] text-warn">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={submitPrice}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong"
              >
                {t("archive.gapSavePrice")}
              </button>
            </div>
          </div>
        )}

        {action === "search" && (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              {t("archive.gapSearchHint")}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-sm text-ink-faint hover:text-ink"
              >
                {t("common.close")}
              </button>
              {gap.searchQuery && onSearch && (
                <button
                  type="button"
                  onClick={() => {
                    onSearch(gap.searchQuery!);
                    onClose();
                  }}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  {t("archive.gapGoToDoc")}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
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
