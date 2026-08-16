"use client";

import { useMemo, useState } from "react";
import type { TicketFormConfig, TicketFormField } from "@/lib/ticketForm";

const ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp,.gif";

export function TicketEmbedForm({
  companySlug,
  companyName,
  config,
}: {
  companySlug: string;
  companyName: string;
  config: TicketFormConfig;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const visible = config.fields.filter((f) => f.enabled);
  const previews = useMemo(
    () =>
      files.map((f) => ({
        name: f.name,
        image: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      })),
    [files]
  );

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    form.set("company", companySlug);
    for (const file of files) form.append("files", file);
    try {
      const res = await fetch("/api/embed/ticket", { method: "POST", body: form });
      const data = (await res.json()) as { error?: string; id?: string };
      if (!res.ok) {
        setError(data.error ?? "Invio non riuscito.");
        return;
      }
      setTicketId(data.id ?? "ok");
    } catch {
      setError("Errore di rete. Riprova.");
    } finally {
      setPending(false);
    }
  };

  if (ticketId) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center px-5 py-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {companyName}
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Richiesta inviata</h1>
        <p className="mt-2 max-w-md text-sm text-ink-muted">
          Abbiamo aperto il ticket{" "}
          <span className="font-mono font-semibold text-brand">#{ticketId}</span>.
          Ti ricontatteremo se hai lasciato un recapito.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {companyName}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-ink">
        {config.title.trim() || "Apri un ticket"}
      </h1>
      {config.intro && (
        <p className="mt-1 text-sm text-ink-muted">{config.intro}</p>
      )}

      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((field) => (
            <div
              key={field.id}
              className={
                field.type === "textarea" ||
                field.type === "files" ||
                field.key === "summary" ||
                field.key === "description"
                  ? "sm:col-span-2"
                  : ""
              }
            >
              <FormField
                field={field}
                onFiles={field.type === "files" ? setFiles : undefined}
                previews={field.type === "files" ? previews : undefined}
              />
            </div>
          ))}
        </div>

        {error && (
          <p className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-strong disabled:opacity-50"
        >
          {pending ? "Invio…" : "Invia ticket"}
        </button>
      </form>
    </div>
  );
}

function FormField({
  field,
  onFiles,
  previews,
}: {
  field: TicketFormField;
  onFiles?: (files: File[]) => void;
  previews?: { name: string; image: string | null }[];
}) {
  const label = `${field.label.trim() || field.key}${field.required ? " *" : ""}`;
  return (
    <label className="block text-sm text-ink-muted">
      {label}
      <div className="mt-1">
        {field.type === "textarea" ? (
          <textarea
            name={field.key}
            required={field.required}
            minLength={field.required ? 8 : undefined}
            rows={4}
            placeholder={field.placeholder}
            className={`${inputClass} resize-none`}
          />
        ) : field.type === "select" ? (
          <select
            name={field.key}
            required={field.required}
            className={inputClass}
            defaultValue={field.options?.[0]?.value ?? ""}
          >
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : field.type === "files" ? (
          <>
            <input
              type="file"
              accept={ACCEPT}
              multiple
              required={field.required}
              onChange={(e) =>
                onFiles?.(Array.from(e.target.files ?? []).slice(0, 6))
              }
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              Fino a 6 file, max 8 MB ciascuno. Foto, PDF, Word, Excel.
            </p>
            {previews && previews.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {previews.map((f) => (
                  <li
                    key={f.name}
                    className="overflow-hidden rounded-lg border border-border bg-base"
                  >
                    {f.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={f.image} alt="" className="h-16 w-16 object-cover" />
                    ) : (
                      <span className="block max-w-[140px] truncate px-2 py-2 text-[11px] text-ink-muted">
                        {f.name}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <input
            name={field.key}
            type={field.type === "email" || field.type === "tel" ? field.type : "text"}
            required={field.required}
            minLength={field.required && field.key === "summary" ? 3 : undefined}
            placeholder={field.placeholder}
            className={inputClass}
          />
        )}
      </div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
