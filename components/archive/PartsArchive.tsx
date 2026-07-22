"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type {
  SparePart,
  SparePartStatus,
  SparePartSuccedaneo,
  SuccedaneoTipo,
} from "@/lib/sparePartTypes";
import {
  SUCCEDANEO_TIPO_LABELS,
  computeSpareCompleteness,
  inverseSuccedaneoTipo,
} from "@/lib/sparePartTypes";

type FilterChip =
  | "tutti"
  | "senza_prezzo"
  | "senza_succedanei"
  | "da_verificare";

interface Props {
  parts: SparePart[];
  onChange: (parts: SparePart[]) => void;
  onPatch: (part: SparePart) => void;
  extractProgress?: { label: string; pct: number } | null;
  query?: string;
  onQueryChange?: (q: string) => void;
}

const COLS: { key: keyof SparePart | "docs"; label: string; w?: string }[] = [
  { key: "codice", label: "Codice", w: "w-28" },
  { key: "descrizione", label: "Descrizione" },
  { key: "categoria", label: "Cat.", w: "w-20" },
  { key: "um", label: "UM", w: "w-12" },
  { key: "prezzoListino", label: "Prezzo", w: "w-20" },
  { key: "fornitore", label: "Fornitore", w: "w-28" },
  { key: "macchinaCompatibile", label: "Macchina", w: "w-24" },
  { key: "stato", label: "Stato", w: "w-20" },
  { key: "completezza", label: "%", w: "w-12" },
  { key: "docs", label: "Doc", w: "w-16" },
];

export function PartsArchive({
  parts,
  onChange,
  onPatch,
  extractProgress,
  query: queryProp,
  onQueryChange,
}: Props) {
  const [queryLocal, setQueryLocal] = useState("");
  const query = queryProp ?? queryLocal;
  const setQuery = onQueryChange ?? setQueryLocal;
  const [chip, setChip] = useState<FilterChip>("tutti");
  const [categoria, setCategoria] = useState("");
  const [macchina, setMacchina] = useState("");
  const [fornitore, setFornitore] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(parts.map((p) => p.categoria).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "it")),
    [parts]
  );
  const machines = useMemo(
    () =>
      Array.from(
        new Set(
          parts.map((p) => p.macchinaCompatibile).filter(Boolean) as string[]
        )
      ).sort((a, b) => a.localeCompare(b, "it")),
    [parts]
  );
  const suppliers = useMemo(
    () =>
      Array.from(
        new Set(parts.map((p) => p.fornitore).filter(Boolean) as string[])
      ).sort((a, b) => a.localeCompare(b, "it")),
    [parts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return parts.filter((p) => {
      if (categoria && p.categoria !== categoria) return false;
      if (macchina && p.macchinaCompatibile !== macchina) return false;
      if (fornitore && p.fornitore !== fornitore) return false;
      if (chip === "senza_prezzo" && p.prezzoListino != null && p.prezzoListino > 0)
        return false;
      if (chip === "senza_succedanei" && p.succedanei.length > 0) return false;
      if (chip === "da_verificare" && !p.daVerificare) return false;
      if (!q) return true;
      return (
        p.codice.toLowerCase().includes(q) ||
        p.descrizione.toLowerCase().includes(q) ||
        (p.codiceOEM ?? "").toLowerCase().includes(q)
      );
    });
  }, [parts, query, chip, categoria, macchina, fornitore]);

  const stats = useMemo(() => {
    const senzaPrezzo = parts.filter(
      (p) => p.prezzoListino == null || p.prezzoListino <= 0
    ).length;
    const daVerificare = parts.filter((p) => p.daVerificare).length;
    return { n: parts.length, senzaPrezzo, daVerificare };
  }, [parts]);

  const selected = parts.find((p) => p.id === selectedId) ?? null;

  const patchPart = (id: string, patch: Partial<SparePart>) => {
    const next = parts.map((p) => {
      if (p.id !== id) return p;
      const merged = { ...p, ...patch };
      merged.completezza = computeSpareCompleteness(merged);
      return merged;
    });
    onChange(next);
    const updated = next.find((p) => p.id === id);
    if (updated) onPatch(updated);
  };

  const addSuccedaneo = (
    partId: string,
    code: string,
    tipo: SuccedaneoTipo,
    note?: string
  ) => {
    const targetCode = code.trim().toUpperCase();
    if (!targetCode) return;
    let next = parts.map((p) => {
      if (p.id !== partId) return p;
      if (p.succedanei.some((s) => s.code === targetCode && s.tipo === tipo)) {
        return p;
      }
      const succedanei: SparePartSuccedaneo[] = [
        ...p.succedanei,
        { code: targetCode, tipo, note },
      ];
      return { ...p, succedanei };
    });

    const inverse = inverseSuccedaneoTipo(tipo);
    const source = parts.find((p) => p.id === partId);
    if (source && (tipo === "sostituisce" || tipo === "sostituito_da")) {
      next = next.map((p) => {
        if (p.codice.toUpperCase() !== targetCode) return p;
        if (
          p.succedanei.some(
            (s) => s.code === source.codice && s.tipo === inverse
          )
        ) {
          return p;
        }
        return {
          ...p,
          succedanei: [
            ...p.succedanei,
            { code: source.codice, tipo: inverse, note },
          ],
        };
      });
    }

    onChange(next);
    for (const p of next) {
      if (
        p.id === partId ||
        p.codice.toUpperCase() === targetCode
      ) {
        onPatch(p);
      }
    }
  };

  const removeSuccedaneo = (partId: string, code: string, tipo: SuccedaneoTipo) => {
    const source = parts.find((p) => p.id === partId);
    let next = parts.map((p) => {
      if (p.id !== partId) return p;
      return {
        ...p,
        succedanei: p.succedanei.filter(
          (s) => !(s.code === code && s.tipo === tipo)
        ),
      };
    });
    if (source && (tipo === "sostituisce" || tipo === "sostituito_da")) {
      const inverse = inverseSuccedaneoTipo(tipo);
      next = next.map((p) => {
        if (p.codice.toUpperCase() !== code.toUpperCase()) return p;
        return {
          ...p,
          succedanei: p.succedanei.filter(
            (s) => !(s.code === source.codice && s.tipo === inverse)
          ),
        };
      });
    }
    onChange(next);
    for (const p of next) {
      if (p.id === partId || p.codice.toUpperCase() === code.toUpperCase()) {
        onPatch(p);
      }
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="font-semibold tabular-nums text-ink">{stats.n}</span>
        <span className="text-xs text-ink-faint">ricambi</span>
        <span className="text-ink-faint">·</span>
        <span className="font-semibold tabular-nums text-warn">
          {stats.senzaPrezzo}
        </span>
        <span className="text-xs text-ink-faint">senza prezzo</span>
        <span className="text-ink-faint">·</span>
        <span className="font-semibold tabular-nums text-brand">
          {stats.daVerificare}
        </span>
        <span className="text-xs text-ink-faint">da verificare</span>
        {extractProgress && (
          <span className="ml-auto text-[11px] text-ink-muted">
            {extractProgress.label} · {extractProgress.pct}%
          </span>
        )}
      </div>

      <div className="relative mb-2">
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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca codice o descrizione…"
          className="w-full rounded-lg border border-border bg-base py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {(
          [
            ["tutti", "Tutti"],
            ["senza_prezzo", "Senza prezzo"],
            ["senza_succedanei", "Senza succedanei"],
            ["da_verificare", "Da verificare"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setChip(id)}
            className={[
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              chip === id
                ? "border-brand/50 bg-brand-soft text-ink"
                : "border-border bg-base text-ink-muted hover:border-border-strong",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="rounded-full border border-border bg-base px-2 py-1 text-[11px] text-ink-muted"
        >
          <option value="">Categoria</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={macchina}
          onChange={(e) => setMacchina(e.target.value)}
          className="rounded-full border border-border bg-base px-2 py-1 text-[11px] text-ink-muted"
        >
          <option value="">Macchina</option>
          {machines.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={fornitore}
          onChange={(e) => setFornitore(e.target.value)}
          className="rounded-full border border-border bg-base px-2 py-1 text-[11px] text-ink-muted"
        >
          <option value="">Fornitore</option>
          {suppliers.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-border bg-base/50">
        {filtered.length === 0 ? (
          <div className="flex h-40 items-center justify-center p-6 text-center text-sm text-ink-faint">
            Nessun ricambio. Usa «Estrai ricambi» sui file Excel in archivio.
          </div>
        ) : (
          <table className="w-full min-w-[900px] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-surface-2/95 backdrop-blur">
              <tr className="border-b border-border">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    className={[
                      "px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint",
                      c.w ?? "",
                    ].join(" ")}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={[
                    "cursor-pointer border-b border-border/60 hover:bg-brand-soft/40",
                    selectedId === p.id ? "bg-brand-soft/60" : "",
                    p.daVerificare ? "bg-warn/5" : "",
                  ].join(" ")}
                >
                  <InlineCell
                    value={p.codice}
                    onCommit={(v) => patchPart(p.id, { codice: v.toUpperCase() })}
                    mono
                  />
                  <InlineCell
                    value={p.descrizione}
                    onCommit={(v) => patchPart(p.id, { descrizione: v })}
                  />
                  <InlineCell
                    value={p.categoria ?? ""}
                    onCommit={(v) =>
                      patchPart(p.id, { categoria: v || undefined })
                    }
                  />
                  <InlineCell
                    value={p.um ?? ""}
                    onCommit={(v) => patchPart(p.id, { um: v || undefined })}
                  />
                  <InlineCell
                    value={
                      p.prezzoListino != null
                        ? String(p.prezzoListino).replace(".", ",")
                        : ""
                    }
                    onCommit={(v) => {
                      const n = Number(v.replace(",", "."));
                      patchPart(p.id, {
                        prezzoListino:
                          v.trim() && Number.isFinite(n) ? n : null,
                      });
                    }}
                  />
                  <InlineCell
                    value={p.fornitore ?? ""}
                    onCommit={(v) =>
                      patchPart(p.id, { fornitore: v || undefined })
                    }
                  />
                  <InlineCell
                    value={p.macchinaCompatibile ?? ""}
                    onCommit={(v) =>
                      patchPart(p.id, {
                        macchinaCompatibile: v || undefined,
                      })
                    }
                  />
                  <td className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={p.stato}
                      onChange={(e) =>
                        patchPart(p.id, {
                          stato: e.target.value as SparePartStatus,
                        })
                      }
                      className="w-full rounded border border-transparent bg-transparent text-xs text-ink hover:border-border"
                    >
                      <option value="attivo">Attivo</option>
                      <option value="obsoleto">Obsoleto</option>
                      <option value="sostituito">Sostituito</option>
                    </select>
                  </td>
                  <td className="px-2 py-1 tabular-nums text-ink-muted">
                    {p.completezza}%
                  </td>
                  <td className="px-2 py-1">
                    <DocBadge sources={p.sorgenti} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected && (
        <PartDrawer
          part={selected}
          allParts={parts}
          onClose={() => setSelectedId(null)}
          onPatch={(patch) => patchPart(selected.id, patch)}
          onAddSuccedaneo={(code, tipo, note) =>
            addSuccedaneo(selected.id, code, tipo, note)
          }
          onRemoveSuccedaneo={(code, tipo) =>
            removeSuccedaneo(selected.id, code, tipo)
          }
        />
      )}
    </div>
  );
}

function InlineCell({
  value,
  onCommit,
  mono,
}: {
  value: string;
  onCommit: (v: string) => void;
  mono?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  if (!editing) {
    return (
      <td
        className={[
          "max-w-[200px] truncate px-2 py-1.5 text-ink",
          mono ? "font-mono text-[11px]" : "",
        ].join(" ")}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        title="Doppio click per modificare"
      >
        {value || (
          <span className="text-ink-faint">—</span>
        )}
      </td>
    );
  }

  return (
    <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (draft !== value) onCommit(draft);
          }
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full rounded border border-brand bg-base px-1.5 py-1 text-xs text-ink outline-none"
      />
    </td>
  );
}

function DocBadge({
  sources,
}: {
  sources: SparePart["sorgenti"];
}) {
  if (sources.length === 0) {
    return <span className="text-[10px] text-ink-faint">—</span>;
  }
  const tip = sources
    .map((s) => {
      const bits = [s.fileName];
      if (s.sheet) bits.push(`foglio ${s.sheet}`);
      if (s.row) bits.push(`riga ${s.row}`);
      return bits.join(" · ");
    })
    .join("\n");
  return (
    <span
      title={tip}
      className="inline-flex items-center rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand"
    >
      {sources.length}
    </span>
  );
}

function PartDrawer({
  part,
  allParts,
  onClose,
  onPatch,
  onAddSuccedaneo,
  onRemoveSuccedaneo,
}: {
  part: SparePart;
  allParts: SparePart[];
  onClose: () => void;
  onPatch: (patch: Partial<SparePart>) => void;
  onAddSuccedaneo: (
    code: string,
    tipo: SuccedaneoTipo,
    note?: string
  ) => void;
  onRemoveSuccedaneo: (code: string, tipo: SuccedaneoTipo) => void;
}) {
  const titleId = useId();
  const [tab, setTab] = useState<
    "anagrafica" | "fornitore" | "succedanei" | "documenti"
  >("anagrafica");
  const [succCode, setSuccCode] = useState("");
  const [succTipo, setSuccTipo] = useState<SuccedaneoTipo>("equivalente");
  const [succNote, setSuccNote] = useState("");

  const suggestions = useMemo(() => {
    const q = succCode.trim().toLowerCase();
    if (q.length < 1) return [];
    return allParts
      .filter(
        (p) =>
          p.codice.toUpperCase() !== part.codice.toUpperCase() &&
          (p.codice.toLowerCase().includes(q) ||
            p.descrizione.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allParts, part.codice, succCode]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/30" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-base shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby={titleId}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="truncate font-mono text-sm font-bold text-ink">
              {part.codice}
            </p>
            <p className="truncate text-xs text-ink-muted">{part.descrizione}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs text-ink-faint hover:text-ink"
          >
            Chiudi
          </button>
        </div>

        <div className="flex gap-1 border-b border-border px-2 pt-2">
          {(
            [
              ["anagrafica", "Anagrafica"],
              ["fornitore", "Fornitore"],
              ["succedanei", "Succedanei"],
              ["documenti", "Documenti"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={[
                "rounded-t-lg px-3 py-2 text-[11px] font-semibold",
                tab === id
                  ? "bg-surface text-ink"
                  : "text-ink-faint hover:text-ink-muted",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {tab === "anagrafica" && (
            <>
              <Field
                label="Codice OEM"
                value={part.codiceOEM ?? ""}
                onChange={(v) => onPatch({ codiceOEM: v || undefined })}
              />
              <Field
                label="Descrizione"
                value={part.descrizione}
                onChange={(v) => onPatch({ descrizione: v })}
              />
              <Field
                label="Categoria"
                value={part.categoria ?? ""}
                onChange={(v) => onPatch({ categoria: v || undefined })}
              />
              <Field
                label="UM"
                value={part.um ?? ""}
                onChange={(v) => onPatch({ um: v || undefined })}
              />
              <Field
                label="Prezzo listino"
                value={
                  part.prezzoListino != null
                    ? String(part.prezzoListino).replace(".", ",")
                    : ""
                }
                onChange={(v) => {
                  const n = Number(v.replace(",", "."));
                  onPatch({
                    prezzoListino: v.trim() && Number.isFinite(n) ? n : null,
                  });
                }}
              />
              <Field
                label="Macchina compatibile"
                value={part.macchinaCompatibile ?? ""}
                onChange={(v) =>
                  onPatch({ macchinaCompatibile: v || undefined })
                }
              />
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Stato
                <select
                  value={part.stato}
                  onChange={(e) =>
                    onPatch({ stato: e.target.value as SparePartStatus })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink"
                >
                  <option value="attivo">Attivo</option>
                  <option value="obsoleto">Obsoleto</option>
                  <option value="sostituito">Sostituito</option>
                </select>
              </label>
              <p className="text-[11px] text-ink-faint">
                Completezza {part.completezza}%
                {part.daVerificare ? " · da verificare" : ""}
              </p>
            </>
          )}

          {tab === "fornitore" && (
            <>
              <Field
                label="Fornitore"
                value={part.fornitore ?? ""}
                onChange={(v) => onPatch({ fornitore: v || undefined })}
              />
              <Field
                label="Codice fornitore"
                value={part.codiceFornitore ?? ""}
                onChange={(v) => onPatch({ codiceFornitore: v || undefined })}
              />
              <Field
                label="Lead time (giorni)"
                value={
                  part.leadTimeGiorni != null ? String(part.leadTimeGiorni) : ""
                }
                onChange={(v) => {
                  const n = Number(v);
                  onPatch({
                    leadTimeGiorni: v.trim() && Number.isFinite(n) ? n : null,
                  });
                }}
              />
            </>
          )}

          {tab === "succedanei" && (
            <>
              <ul className="space-y-2">
                {part.succedanei.length === 0 && (
                  <li className="text-xs text-ink-faint">Nessun succedaneo.</li>
                )}
                {part.succedanei.map((s) => (
                  <li
                    key={`${s.code}-${s.tipo}`}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-mono text-xs font-semibold text-ink">
                        {s.code}
                      </p>
                      <p className="text-[11px] text-ink-muted">
                        {SUCCEDANEO_TIPO_LABELS[s.tipo]}
                        {s.note ? ` · ${s.note}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveSuccedaneo(s.code, s.tipo)}
                      className="text-[11px] text-ink-faint hover:text-warn"
                    >
                      Rimuovi
                    </button>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 rounded-xl border border-border bg-surface/40 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Aggiungi
                </p>
                <input
                  value={succCode}
                  onChange={(e) => setSuccCode(e.target.value)}
                  placeholder="Codice ricambio…"
                  className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
                {suggestions.length > 0 && (
                  <ul className="max-h-32 overflow-y-auto rounded-lg border border-border bg-base">
                    {suggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => setSuccCode(s.codice)}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-brand-soft"
                        >
                          <span className="font-mono font-semibold">
                            {s.codice}
                          </span>{" "}
                          <span className="text-ink-muted">{s.descrizione}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <select
                  value={succTipo}
                  onChange={(e) =>
                    setSuccTipo(e.target.value as SuccedaneoTipo)
                  }
                  className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink"
                >
                  {(Object.keys(SUCCEDANEO_TIPO_LABELS) as SuccedaneoTipo[]).map(
                    (t) => (
                      <option key={t} value={t}>
                        {SUCCEDANEO_TIPO_LABELS[t]}
                      </option>
                    )
                  )}
                </select>
                <input
                  value={succNote}
                  onChange={(e) => setSuccNote(e.target.value)}
                  placeholder="Note (opzionale)"
                  className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => {
                    onAddSuccedaneo(succCode, succTipo, succNote || undefined);
                    setSuccCode("");
                    setSuccNote("");
                  }}
                  disabled={!succCode.trim()}
                  className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                >
                  Aggiungi succedaneo
                </button>
              </div>
            </>
          )}

          {tab === "documenti" && (
            <ul className="space-y-2">
              {part.sorgenti.length === 0 && (
                <li className="text-xs text-ink-faint">Nessuna sorgente.</li>
              )}
              {part.sorgenti.map((s, i) => (
                <li
                  key={`${s.fileId}-${i}`}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-ink"
                >
                  <p className="font-medium">{s.fileName}</p>
                  <p className="text-[11px] text-ink-faint">
                    {[
                      s.sheet ? `foglio ${s.sheet}` : null,
                      s.row ? `riga ${s.row}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Metadati sorgente"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal normal-case text-ink outline-none focus:border-brand"
      />
    </label>
  );
}
