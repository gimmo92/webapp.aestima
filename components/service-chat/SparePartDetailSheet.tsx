"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { euro } from "@/lib/quote";
import { useI18n } from "@/lib/i18n";
import type { SparePartProposal } from "@/lib/serviceChatTypes";
import {
  addToQuoteDraft,
  hasQuoteDraft,
  readQuoteDraft,
} from "@/lib/quoteDraft";
import {
  findSparePartSubstitutes,
  type CatalogPartLike,
  type SubstituteReason,
} from "@/lib/sparePartSubstitutes";

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

function toCatalogPart(rec: Record<string, unknown> | null): CatalogPartLike | null {
  if (!rec) return null;
  const codice = pickString(rec, "codice", "code");
  if (!codice) return null;
  const succedaneiRaw = rec.succedanei ?? rec.successors;
  const succedanei = Array.isArray(succedaneiRaw)
    ? succedaneiRaw
        .map((item) => {
          const row = asRecord(item);
          const code = pickString(row, "code", "codice");
          if (!code) return null;
          return {
            code,
            tipo: (pickString(row, "tipo", "type") ?? "equivalente") as
              | "equivalente"
              | "sostituisce"
              | "sostituito_da"
              | "alternativa_fornitore",
            note: pickString(row, "note"),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)
    : [];
  return {
    codice,
    descrizione:
      pickString(rec, "descrizione", "description") ?? codice,
    nome: pickString(rec, "nome", "name"),
    codiceOEM: pickString(rec, "codiceOEM", "codiceOem", "oemCode"),
    stato: pickString(rec, "stato", "status"),
    prezzoListino: pickNumber(rec, "prezzoListino", "price") ?? null,
    disponibile:
      typeof rec.disponibile === "boolean"
        ? rec.disponibile
        : typeof rec.available === "boolean"
          ? rec.available
          : null,
    succedanei,
  };
}

function catalogToProposal(
  rec: Record<string, unknown>,
  fallback?: SparePartProposal
): SparePartProposal {
  const like = toCatalogPart(rec);
  const code = like?.codice ?? fallback?.code ?? "";
  const available = like?.disponibile === true;
  return {
    code,
    description: like?.descrizione ?? fallback?.description ?? code,
    price: like?.prezzoListino ?? fallback?.price ?? 0,
    availability: available ? "disponibile" : "da_ordinare",
    oemCode: like?.codiceOEM ?? fallback?.oemCode,
    name: like?.nome ?? fallback?.name,
  };
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
  onOpenPart,
}: {
  part: SparePartProposal;
  onClose: () => void;
  onOpenPart?: (next: SparePartProposal) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const titleId = useId();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [draftTick, setDraftTick] = useState(0);

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
    fetch("/api/spare-parts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = asRecord(data)?.spareParts;
        setRows(Array.isArray(list) ? list.map((r) => asRecord(r)).filter((r): r is Record<string, unknown> => Boolean(r)) : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [part.code]);

  const catalog = useMemo(() => {
    const code = part.code.toLowerCase();
    return (
      rows.find((row) => pickString(row, "codice", "code")?.toLowerCase() === code) ??
      null
    );
  }, [rows, part.code]);

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
  const statusRaw = pickString(catalog, "stato", "status");
  const statusKey = (statusRaw ?? "").toLowerCase();
  const isObsolete = statusKey === "obsoleto";
  const statusLabel =
    statusKey === "obsoleto"
      ? t("spare.statusObsolete")
      : statusKey === "sostituito"
        ? t("spare.statusReplaced")
        : statusKey === "attivo"
          ? t("spare.statusActive")
          : statusRaw;
  const imageUrl = pickImageUrl(catalog);

  const catalogParts = useMemo(
    () =>
      rows
        .map((row) => toCatalogPart(row))
        .filter((p): p is CatalogPartLike => p !== null),
    [rows]
  );
  const currentLike = useMemo(() => {
    const fromCatalog = toCatalogPart(catalog);
    if (fromCatalog) return fromCatalog;
    return {
      codice: part.code,
      descrizione: description,
      nome: name,
      codiceOEM: oem,
      stato: statusRaw,
      prezzoListino: price ?? null,
      disponibile: available,
      succedanei: [],
    } satisfies CatalogPartLike;
  }, [catalog, part.code, description, name, oem, statusRaw, price, available]);

  const substitutes = useMemo(
    () =>
      isObsolete
        ? findSparePartSubstitutes(currentLike, catalogParts)
        : [],
    [isObsolete, currentLike, catalogParts]
  );

  const inDraft =
    draftTick >= 0 &&
    readQuoteDraft().some(
      (l) => l.code.toUpperCase() === part.code.toUpperCase()
    );
  const draftExists = draftTick >= 0 && hasQuoteDraft();

  const goToOffer = () => {
    if (!inDraft) {
      addToQuoteDraft({
        code: part.code,
        description: name || description,
        unitPrice: price ?? 0,
        qty: 1,
      });
      setDraftTick((n) => n + 1);
    }
    onClose();
    router.push("/crea?draft=1");
  };

  const reasonLabel = (reason: SubstituteReason) => {
    if (reason === "listed") return t("spare.substituteListed");
    if (reason === "replaces") return t("spare.substituteReplaces");
    if (reason === "oem") return t("spare.substituteOem");
    return t("spare.substituteSimilar");
  };

  const ctaLabel = !draftExists
    ? t("spare.createOffer")
    : inDraft
      ? t("spare.goToOffer")
      : t("spare.addToOffer");

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

          {isObsolete && (
            <div className="mb-4 rounded-xl border border-warn/40 bg-warn/10 px-3 py-2.5">
              <p className="text-sm font-semibold text-ink">
                {t("spare.obsoleteBanner")}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">
                {t("spare.obsoleteHint")}
              </p>
            </div>
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
            <Field label={t("spare.status")} value={statusLabel} />
            {typeof part.confidence === "number" && (
              <Field
                label={t("spare.confidence")}
                value={`${Math.round(part.confidence)}%`}
              />
            )}
          </div>

          {isObsolete && (
            <div className="mt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {t("spare.substitutesTitle")}
              </p>
              {substitutes.length === 0 ? (
                <p className="rounded-lg border border-border bg-surface-2/40 px-3 py-3 text-sm text-ink-faint">
                  {t("spare.substitutesEmpty")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {substitutes.map((item) => {
                    const rec = rows.find(
                      (row) =>
                        pickString(row, "codice", "code")?.toUpperCase() ===
                        item.part.codice.toUpperCase()
                    );
                    return (
                      <li key={item.part.codice}>
                        <button
                          type="button"
                          onClick={() => {
                            if (rec) {
                              onOpenPart?.(catalogToProposal(rec, part));
                              return;
                            }
                            onOpenPart?.({
                              code: item.part.codice,
                              description: item.part.descrizione,
                              price: item.part.prezzoListino ?? 0,
                              availability: item.part.disponibile
                                ? "disponibile"
                                : "da_ordinare",
                              name: item.part.nome ?? undefined,
                              oemCode: item.part.codiceOEM ?? undefined,
                            });
                          }}
                          className="w-full rounded-xl border border-border bg-surface-2/40 px-3 py-2.5 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-sm font-semibold text-brand">
                              {item.part.codice}
                            </span>
                            {item.part.prezzoListino != null &&
                              item.part.prezzoListino > 0 && (
                                <span className="shrink-0 text-xs font-semibold tabular-nums text-ink">
                                  {euro(item.part.prezzoListino)}
                                </span>
                              )}
                          </div>
                          <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                            {item.part.nome || item.part.descrizione}
                          </p>
                          <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                            {reasonLabel(item.reason)}
                            {item.tipo ? ` · ${item.tipo}` : ""}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {!isObsolete && (
          <div className="shrink-0 border-t border-border p-4">
            <button
              type="button"
              onClick={goToOffer}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong"
            >
              {ctaLabel}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
