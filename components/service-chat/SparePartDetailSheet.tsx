"use client";

import { useEffect, useId, useState } from "react";
import { euro } from "@/lib/quote";
import { useI18n } from "@/lib/i18n";
import type { SparePartProposal } from "@/lib/serviceChatTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(
  obj: Record<string, unknown> | null,
  ...keys: string[]
): string | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickNumber(
  obj: Record<string, unknown> | null,
  ...keys: string[]
): number | undefined {
  if (!obj) return undefined;
  for (const key of keys) {
    const v = obj[key];
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function pickImageUrl(obj: Record<string, unknown> | null): string | undefined {
  if (!obj) return undefined;
  const list = obj.immagini ?? obj.images;
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const first = asRecord(list[0]);
  return pickString(first, "url", "href", "src");
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number | null;
  mono?: boolean;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </span>
      <span
        className={[
          "text-right text-sm font-medium text-ink",
          mono ? "font-mono text-brand" : "",
        ].join(" ")}
      >
        {value}
      </span>
    </div>
  );
}

/** Scheda read-only con i dati di catalogo del ricambio identificato. */
export function SparePartDetailSheet({
  part,
  onClose,
}: {
  part: SparePartProposal;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const titleId = useId();
  const [catalog, setCatalog] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setCatalog(null);
    const code = part.code.toLowerCase();
    fetch("/api/spare-parts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const rows = asRecord(data)?.spareParts;
        if (!Array.isArray(rows)) return;
        const match = rows.find((row) => {
          const rec = asRecord(row);
          const c = pickString(rec, "codice", "code");
          return c?.toLowerCase() === code;
        });
        setCatalog(asRecord(match) ?? null);
      })
      .catch(() => {
        if (!cancelled) setCatalog(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [part.code]);

  const description =
    pickString(catalog, "descrizione", "description") ?? part.description;
  const name = pickString(catalog, "nome", "name") ?? part.name;
  const oem =
    pickString(catalog, "codiceOEM", "codiceOem", "oemCode") ?? part.oemCode;
  const brand = pickString(catalog, "brand") ?? part.brand;
  const manufacturer =
    pickString(catalog, "produttore", "manufacturer") ?? part.manufacturer;
  const supplier =
    pickString(catalog, "fornitore", "supplier") ?? part.supplier;
  const supplierCode = pickString(
    catalog,
    "codiceFornitore",
    "supplierCode"
  );
  const category =
    pickString(catalog, "categoria", "category") ?? part.category;
  const unit = pickString(catalog, "um", "unit") ?? part.unit;
  const machine =
    pickString(catalog, "macchinaCompatibile", "compatibleMachine") ??
    part.compatibleMachine;
  const price =
    pickNumber(catalog, "prezzoListino", "price") ?? part.price;
  const lead =
    pickNumber(catalog, "leadTimeGiorni", "leadTimeDays") ??
    part.leadTimeDays;
  const availableRaw = catalog
    ? catalog.disponibile ?? catalog.available
    : part.availability === "disponibile";
  const available =
    typeof availableRaw === "boolean"
      ? availableRaw
      : part.availability === "disponibile";
  const status = pickString(catalog, "stato", "status");
  const imageUrl = pickImageUrl(catalog);
  const succedanei = Array.isArray(catalog?.succedanei)
    ? catalog.succedanei
    : Array.isArray(catalog?.successors)
      ? catalog.successors
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/40"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl shadow-black/20"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              {t("spare.sheetTitle")}
            </p>
            <h2
              id={titleId}
              className="mt-0.5 truncate font-mono text-base font-bold text-brand"
            >
              {part.code}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-ink-muted">
              {name || description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label={t("common.close")}
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="mb-4 max-h-44 w-full rounded-xl border border-border bg-surface-2 object-contain"
            />
          )}

          {loading && (
            <p className="mb-3 text-xs text-ink-faint">
              {t("spare.loadingDetails")}
            </p>
          )}

          <div className="rounded-xl border border-border bg-surface-2/40 px-3">
            <Field label={t("spare.code")} value={part.code} mono />
            <Field label={t("spare.oem")} value={oem} mono />
            <Field label={t("spare.name")} value={name} />
            <Field label={t("spare.description")} value={description} />
            <Field label={t("spare.category")} value={category} />
            <Field label={t("spare.unit")} value={unit} />
            <Field
              label={t("spare.listPrice")}
              value={price != null ? euro(price) : undefined}
            />
            <Field
              label={t("spare.availability")}
              value={
                available ? t("spare.available") : t("spare.toOrder")
              }
            />
            <Field
              label={t("spare.leadTime")}
              value={
                lead != null
                  ? t("spare.leadTimeDays", { n: lead })
                  : undefined
              }
            />
            <Field label={t("spare.brand")} value={brand} />
            <Field label={t("spare.manufacturer")} value={manufacturer} />
            <Field label={t("spare.supplier")} value={supplier} />
            <Field label={t("spare.supplierCode")} value={supplierCode} mono />
            <Field label={t("spare.machine")} value={machine} />
            <Field label={t("spare.status")} value={status} />
            {typeof part.confidence === "number" && (
              <Field
                label={t("spare.confidence")}
                value={`${Math.round(part.confidence)}%`}
              />
            )}
          </div>

          {succedanei.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {t("spare.alternatives")}
              </p>
              <ul className="space-y-1.5">
                {succedanei.map((item, i) => {
                  const rec = asRecord(item);
                  const code = pickString(rec, "code", "codice") ?? "—";
                  const tipo = pickString(rec, "tipo", "type");
                  return (
                    <li
                      key={`${code}-${i}`}
                      className="rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm"
                    >
                      <span className="font-mono font-semibold text-brand">
                        {code}
                      </span>
                      {tipo && (
                        <span className="ml-2 text-xs text-ink-faint">
                          {tipo}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
