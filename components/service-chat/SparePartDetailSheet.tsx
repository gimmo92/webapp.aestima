"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { euro } from "@/lib/quote";
import { useI18n } from "@/lib/i18n";
import type { SparePartProposal } from "@/lib/serviceChatTypes";
import {
  addToQuoteDraft,
} from "@/lib/quoteDraft";
import { AddToOfferMenu } from "./AddToOfferMenu";
import {
  findSparePartSubstitutes,
  type CatalogPartLike,
  type SubstituteReason,
} from "@/lib/sparePartSubstitutes";
import { sparePartSheetPath } from "@/lib/sparePartSheet";
import { exampleLeadTimeDays } from "@/lib/exampleLeadTime";

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
    descrizione: pickString(rec, "descrizione", "description") ?? codice,
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

function TableRow({
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
    <tr className="border-b border-border/70 last:border-0">
      <th className="w-48 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </th>
      <td
        className={[
          "px-4 py-2.5 text-sm font-medium text-ink",
          mono ? "font-mono text-brand" : "",
        ].join(" ")}
      >
        {value}
      </td>
    </tr>
  );
}

/** Scheda ricambio a pagina intera, in tabella. */
export function SparePartDetailSheet({
  part,
  onOpenPart,
}: {
  part: SparePartProposal;
  onOpenPart?: (part: SparePartProposal) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/spare-parts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = asRecord(data)?.spareParts;
        setRows(
          Array.isArray(list)
            ? list
                .map((r) => asRecord(r))
                .filter((r): r is Record<string, unknown> => Boolean(r))
            : []
        );
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
      rows.find(
        (row) => pickString(row, "codice", "code")?.toLowerCase() === code
      ) ?? null
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
  const supplierCode = pickString(catalog, "codiceFornitore", "supplierCode");
  const category =
    pickString(catalog, "categoria", "category") ?? part.category;
  const unit = pickString(catalog, "um", "unit") ?? part.unit;
  const machine =
    pickString(catalog, "macchinaCompatibile", "compatibleMachine") ??
    part.compatibleMachine;
  const price = pickNumber(catalog, "prezzoListino", "price") ?? part.price;
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
  const lead =
    pickNumber(catalog, "leadTimeGiorni", "leadTimeDays") ??
    part.leadTimeDays ??
    exampleLeadTimeDays({
      codice: part.code,
      categoria: category,
      descrizione: description,
      nome: name,
      disponibile: available,
      stato: statusRaw,
    });
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
      isObsolete ? findSparePartSubstitutes(currentLike, catalogParts) : [],
    [isObsolete, currentLike, catalogParts]
  );

  const addPartToDraft = () => {
    addToQuoteDraft({
      code: part.code,
      description: name || description,
      unitPrice: price ?? 0,
      qty: 1,
    });
  };

  const goToOffer = () => {
    addPartToDraft();
    router.push("/crea?draft=1");
  };

  const goToOrder = () => {
    addPartToDraft();
    router.push("/crea?draft=1&ordine=1");
  };

  const reasonLabel = (reason: SubstituteReason) => {
    if (reason === "listed") return t("spare.substituteListed");
    if (reason === "replaces") return t("spare.substituteReplaces");
    if (reason === "oem") return t("spare.substituteOem");
    return t("spare.substituteSimilar");
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-8 pb-28">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {t("spare.sheetTitle")}
      </p>
      <h1 className="mt-1 font-mono text-2xl font-bold text-brand">{part.code}</h1>
      <p className="mt-1 text-sm text-ink-muted">{name || description}</p>

      {isObsolete && (
        <div className="mt-4 rounded-xl border border-warn/40 bg-warn/10 px-4 py-3">
          <p className="text-sm font-semibold text-ink">{t("spare.obsoleteBanner")}</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">
            {t("spare.obsoleteHint")}
          </p>
        </div>
      )}

      {loading && (
        <p className="mt-4 text-xs text-ink-faint">{t("spare.loadingDetails")}</p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="h-52 w-full rounded-xl border border-border bg-surface-2 object-contain"
          />
        ) : (
          <div className="hidden rounded-xl border border-dashed border-border bg-surface-2/40 lg:block" />
        )}

        <div className="overflow-hidden rounded-xl border border-border bg-surface/60">
          <table className="w-full border-collapse text-left">
            <thead className="bg-surface-2/80">
              <tr className="border-b border-border">
                <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  {t("spare.colField")}
                </th>
                <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  {t("spare.colValue")}
                </th>
              </tr>
            </thead>
            <tbody>
              <TableRow label={t("spare.code")} value={part.code} mono />
              <TableRow label={t("spare.oem")} value={oem} mono />
              <TableRow label={t("spare.name")} value={name} />
              <TableRow label={t("spare.description")} value={description} />
              <TableRow label={t("spare.category")} value={category} />
              <TableRow label={t("spare.unit")} value={unit} />
              <TableRow
                label={t("spare.listPrice")}
                value={price != null ? euro(price) : undefined}
              />
              <TableRow
                label={t("spare.availability")}
                value={available ? t("spare.available") : t("spare.toOrder")}
              />
              <TableRow
                label={t("spare.leadTime")}
                value={
                  lead != null ? t("spare.leadTimeDays", { n: lead }) : undefined
                }
              />
              <TableRow label={t("spare.brand")} value={brand} />
              <TableRow label={t("spare.manufacturer")} value={manufacturer} />
              <TableRow label={t("spare.supplier")} value={supplier} />
              <TableRow label={t("spare.supplierCode")} value={supplierCode} mono />
              <TableRow label={t("spare.machine")} value={machine} />
              <TableRow label={t("spare.status")} value={statusLabel} />
              {typeof part.confidence === "number" && (
                <TableRow
                  label={t("spare.confidence")}
                  value={`${Math.round(part.confidence)}%`}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isObsolete && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            {t("spare.substitutesTitle")}
          </h2>
          {substitutes.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface/60 px-4 py-4 text-sm text-ink-faint">
              {t("spare.substitutesEmpty")}
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border bg-surface/60">
              <table className="w-full border-collapse text-left">
                <thead className="bg-surface-2/80">
                  <tr className="border-b border-border">
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {t("spare.code")}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {t("spare.description")}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {t("spare.listPrice")}
                    </th>
                    <th className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                      {t("spare.colReason")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {substitutes.map((item) => (
                    <tr
                      key={item.part.codice}
                      className="border-b border-border/70 last:border-0 hover:bg-brand-soft/30"
                    >
                      <td className="px-4 py-2.5">
                        {onOpenPart ? (
                          <button
                            type="button"
                            onClick={() =>
                              onOpenPart({
                                code: item.part.codice,
                                description:
                                  item.part.nome || item.part.descrizione,
                                price: item.part.prezzoListino ?? 0,
                                availability:
                                  item.part.disponibile === false
                                    ? "da_ordinare"
                                    : "disponibile",
                                name: item.part.nome ?? undefined,
                                oemCode: item.part.codiceOEM ?? undefined,
                              })
                            }
                            className="font-mono text-sm font-semibold text-brand underline-offset-2 hover:underline"
                          >
                            {item.part.codice}
                          </button>
                        ) : (
                          <Link
                            href={sparePartSheetPath(item.part.codice)}
                            className="font-mono text-sm font-semibold text-brand underline-offset-2 hover:underline"
                          >
                            {item.part.codice}
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-ink">
                        {item.part.nome || item.part.descrizione}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-ink">
                        {item.part.prezzoListino != null &&
                        item.part.prezzoListino > 0
                          ? euro(item.part.prezzoListino)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-muted">
                        {reasonLabel(item.reason)}
                        {item.tipo ? ` · ${item.tipo}` : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {isObsolete && (
        <div className="mt-8">
          <button
            type="button"
            onClick={goToOrder}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong"
          >
            {t("spare.createOrder")}
          </button>
        </div>
      )}

      {!isObsolete && (
        <div className="mt-8 flex flex-wrap items-end gap-3">
          <button
            type="button"
            onClick={goToOffer}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-colors hover:bg-brand-strong"
          >
            {t("spare.createOffer")}
          </button>
          <AddToOfferMenu partCode={part.code} />
        </div>
      )}
    </div>
  );
}
