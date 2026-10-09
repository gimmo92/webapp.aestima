"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { MANUAL_ACCEPT } from "@/lib/manualLimits";

type ManualRow = {
  id: string;
  name: string;
  sizeLabel: string;
  textExtracted: boolean;
  createdAt: string;
};

export function ManualsPanel() {
  const { t, dateLocale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [manuals, setManuals] = useState<ManualRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/manuals");
      if (res.status === 401) {
        setManuals([]);
        setError(t("manuals.auth"));
        return;
      }
      if (!res.ok) {
        setError(t("manuals.error"));
        return;
      }
      const data = (await res.json()) as { manuals?: ManualRow[] };
      setManuals(data.manuals ?? []);
    } catch {
      setError(t("manuals.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (list: FileList | File[] | null) => {
    const files = list ? Array.from(list) : [];
    if (files.length === 0 || uploading) return;
    if (inputRef.current) inputRef.current.value = "";
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      for (const file of files) form.append("files", file);
      const res = await fetch("/api/manuals", { method: "POST", body: form });
      const data = (await res.json().catch(() => null)) as {
        manuals?: ManualRow[];
        error?: string;
      } | null;
      if (res.status === 401) {
        setError(t("manuals.auth"));
        return;
      }
      if (!res.ok) {
        setError(data?.error || t("manuals.error"));
        return;
      }
      setManuals(data?.manuals ?? []);
    } catch {
      setError(t("manuals.error"));
    } finally {
      setUploading(false);
    }
  };

  const remove = async (manual: ManualRow) => {
    if (!window.confirm(t("manuals.deleteConfirm", { name: manual.name }))) {
      return;
    }
    setError(null);
    try {
      const res = await fetch(`/api/manuals/${manual.id}`, { method: "DELETE" });
      if (!res.ok) {
        setError(t("manuals.removeFail"));
        return;
      }
      setManuals((prev) => prev.filter((row) => row.id !== manual.id));
    } catch {
      setError(t("manuals.removeFail"));
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-surface/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">{t("manuals.title")}</h2>
          <p className="mt-1 max-w-2xl text-xs text-ink-faint">{t("manuals.hint")}</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={MANUAL_ACCEPT}
        className="sr-only"
        onChange={(event) => void upload(event.target.files)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void upload(event.dataTransfer.files);
        }}
        className={[
          "mt-3 flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors disabled:opacity-60",
          dragOver
            ? "border-brand bg-brand-soft/40"
            : "border-border-strong bg-base/40 hover:border-brand/40 hover:bg-brand-soft/20",
        ].join(" ")}
      >
        <span className="text-sm font-medium text-ink">
          {uploading ? t("manuals.uploading") : t("manuals.drop")}
        </span>
        <span className="mt-1 text-[11px] text-ink-faint">{t("manuals.formats")}</span>
      </button>

      {error && <p className="mt-3 text-sm text-warn">{error}</p>}

      {loading ? (
        <p className="mt-3 text-sm text-ink-muted">{t("common.loading")}</p>
      ) : manuals.length === 0 && !error ? (
        <p className="mt-3 text-sm text-ink-faint">{t("manuals.empty")}</p>
      ) : manuals.length > 0 ? (
        <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-base/60">
          {manuals.map((manual) => (
            <li
              key={manual.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/manuals/${manual.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-ink hover:text-brand"
                >
                  {manual.name}
                </a>
                <p className="mt-0.5 text-[11px] text-ink-faint">
                  {manual.sizeLabel}
                  {" · "}
                  {new Date(manual.createdAt).toLocaleDateString(dateLocale)}
                  {" · "}
                  {manual.textExtracted
                    ? t("manuals.extracted")
                    : t("manuals.notExtracted")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void remove(manual)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-ink-muted hover:border-border-strong hover:text-ink"
              >
                {t("common.delete")}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
