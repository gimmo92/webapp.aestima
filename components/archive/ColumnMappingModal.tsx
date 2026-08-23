"use client";

import { useEffect, useMemo, useState } from "react";
import type { SpareDbField, SpareFieldDef } from "@/lib/sparePartMapping";
import { SPARE_DB_FIELDS } from "@/lib/sparePartMapping";

export type MappingColumnPreview = {
  index: number;
  header: string;
  sample: string[];
  field: SpareDbField;
};

export type MappingFilePreview = {
  fileId: string;
  fileName: string;
  sheetName: string;
  headerIdx: number;
  rowCount: number;
  columns: MappingColumnPreview[];
};

type DraftFile = MappingFilePreview;

interface Props {
  files: MappingFilePreview[];
  fields?: SpareFieldDef[];
  source?: "ai" | "heuristic";
  applying?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (mappings: Record<string, {
    sheetName: string;
    headerIdx: number;
    columns: Record<string, SpareDbField>;
  }>) => void;
}

export function ColumnMappingModal({
  files,
  fields = SPARE_DB_FIELDS,
  source = "heuristic",
  applying,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const [drafts, setDrafts] = useState<DraftFile[]>(files);
  const [activeId, setActiveId] = useState(files[0]?.fileId ?? "");

  useEffect(() => {
    setDrafts(files);
    setActiveId(files[0]?.fileId ?? "");
  }, [files]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !applying) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onCancel, applying]);

  const active = drafts.find((f) => f.fileId === activeId) ?? drafts[0];
  const hasCodice = useMemo(
    () =>
      drafts.every((f) => f.columns.some((c) => c.field === "codice")),
    [drafts]
  );

  const setField = (fileId: string, index: number, field: SpareDbField) => {
    setDrafts((prev) =>
      prev.map((f) => {
        if (f.fileId !== fileId) return f;
        return {
          ...f,
          columns: f.columns.map((c) => {
            if (c.index !== index) {
              if (field !== "ignore" && c.field === field) {
                return { ...c, field: "ignore" };
              }
              return c;
            }
            return { ...c, field };
          }),
        };
      })
    );
  };

  const confirm = () => {
    const mappings: Record<string, {
      sheetName: string;
      headerIdx: number;
      columns: Record<string, SpareDbField>;
    }> = {};
    for (const f of drafts) {
      const columns: Record<string, SpareDbField> = {};
      for (const c of f.columns) columns[String(c.index)] = c.field;
      mappings[f.fileId] = {
        sheetName: f.sheetName,
        headerIdx: f.headerIdx,
        columns,
      };
    }
    onConfirm(mappings);
  };

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !applying) onCancel();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-base shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">
            Mappa colonne Excel → anagrafica
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Controlla il mapping proposto{" "}
            {source === "ai" ? "dall&apos;AI" : "in automatico"} e conferma
            prima di importare i ricambi.
          </p>
        </div>

        {drafts.length > 1 && (
          <div className="flex gap-1 overflow-x-auto border-b border-border px-3 pt-2">
            {drafts.map((f) => (
              <button
                key={f.fileId}
                type="button"
                onClick={() => setActiveId(f.fileId)}
                className={[
                  "max-w-[180px] truncate rounded-t-lg px-3 py-2 text-xs font-semibold",
                  f.fileId === active.fileId
                    ? "bg-surface text-ink"
                    : "text-ink-faint hover:text-ink-muted",
                ].join(" ")}
              >
                {f.fileName}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <p className="mb-3 text-[11px] text-ink-faint">
            {active.fileName} · foglio {active.sheetName} · {active.rowCount}{" "}
            righe
          </p>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                <th className="pb-2 pr-3">Colonna Excel</th>
                <th className="pb-2 pr-3">Esempio</th>
                <th className="pb-2">Campo database</th>
              </tr>
            </thead>
            <tbody>
              {active.columns.map((col) => (
                <tr key={col.index} className="border-t border-border/70">
                  <td className="py-2 pr-3 align-top font-medium text-ink">
                    {col.header}
                  </td>
                  <td className="max-w-[180px] py-2 pr-3 align-top text-xs text-ink-muted">
                    {col.sample[0] ? (
                      <span className="line-clamp-2" title={col.sample.join(" · ")}>
                        {col.sample[0]}
                      </span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="py-2 align-top">
                    <select
                      value={col.field}
                      onChange={(e) =>
                        setField(
                          active.fileId,
                          col.index,
                          e.target.value as SpareDbField
                        )
                      }
                      className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
                    >
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!hasCodice && (
            <p className="mt-3 text-xs text-warn">
              Serve almeno una colonna mappata su <strong>Codice</strong> per
              ogni file.
            </p>
          )}
          {error && (
            <p className="mt-3 text-xs text-warn">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={applying}
            className="rounded-lg px-3 py-2 text-sm text-ink-muted hover:text-ink disabled:opacity-40"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!hasCodice || applying}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {applying ? "Importazione…" : "Conferma e importa"}
          </button>
        </div>
      </div>
    </div>
  );
}
