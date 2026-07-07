"use client";

import { useEffect, useState } from "react";

// Anteprima tabellare di un file Excel (.xlsx) dall'archivio.
// Il parsing avviene lato client con SheetJS (già usato per l'import fornitori).

interface Props {
  fileName: string;
  url: string;
  onClose: () => void;
}

export function ExcelPreviewModal({ fileName, url, onClose }: Props) {
  const [rows, setRows] = useState<string[][]>([]);
  const [sheetName, setSheetName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("File non trovato.");
        const buffer = await res.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(buffer, { type: "array" });
        const name = wb.SheetNames[0];
        if (!name) throw new Error("Foglio Excel vuoto.");
        const sheet = wb.Sheets[name];
        const data = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
          header: 1,
          defval: "",
        });
        if (cancelled) return;
        setSheetName(name);
        setRows(
          data.map((row) =>
            row.map((cell) => (cell === null || cell === undefined ? "" : String(cell)))
          )
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Impossibile aprire il file.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-base/95 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2ea043]/15 text-[#2ea043] text-xs font-bold">
            XLS
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{fileName}</p>
            {sheetName && (
              <p className="truncate text-[11px] text-ink-faint">{sheetName}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={url}
            download={fileName}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            Scarica
          </a>
          <button
            onClick={onClose}
            aria-label="Chiudi anteprima"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-ink-muted">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            Carico il foglio…
          </div>
        ) : error ? (
          <div className="mx-auto max-w-md rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
            {error}
          </div>
        ) : (
          <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-border bg-white shadow-2xl">
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-left text-xs text-slate-800">
                <tbody>
                  {rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className={ri === 0 ? "bg-slate-100 font-semibold text-slate-600" : "border-t border-slate-100"}
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="whitespace-nowrap px-3 py-2 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
