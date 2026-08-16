"use client";

import { useMemo, useState } from "react";

const ACCEPT =
  "image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.webp,.gif";

export function TicketEmbedForm({
  companySlug,
  companyName,
}: {
  companySlug: string;
  companyName: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
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
          Ti ricontatteremo all&apos;email indicata.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {companyName}
      </p>
      <h1 className="mt-1 text-2xl font-bold text-ink">Apri un ticket</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Segnala un guasto, un ricambio o una richiesta di assistenza. Puoi
        allegare foto e documenti.
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome e cognome *">
            <input name="customerName" required className={inputClass} />
          </Field>
          <Field label="Email *">
            <input name="customerEmail" type="email" required className={inputClass} />
          </Field>
          <Field label="Telefono">
            <input name="customerPhone" className={inputClass} placeholder="+39 …" />
          </Field>
          <Field label="Azienda">
            <input name="customerCompany" className={inputClass} />
          </Field>
        </div>

        <Field label="Oggetto *">
          <input
            name="summary"
            required
            minLength={3}
            className={inputClass}
            placeholder="Es. Rumore sul gruppo spinta"
          />
        </Field>
        <Field label="Descrizione *">
          <textarea
            name="description"
            required
            minLength={8}
            rows={4}
            className={`${inputClass} resize-none`}
            placeholder="Cosa succede, da quando, eventuali allarmi o codici errore…"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Modello macchina">
            <input name="machineModel" className={inputClass} />
          </Field>
          <Field label="Matricola">
            <input name="machineSerial" className={inputClass} />
          </Field>
          <Field label="Categoria">
            <select name="category" defaultValue="altro" className={inputClass}>
              <option value="ricambio">Ricambio</option>
              <option value="troubleshooting">Guasto / troubleshooting</option>
              <option value="altro">Altro</option>
            </select>
          </Field>
          <Field label="Urgenza">
            <select name="priority" defaultValue="normale" className={inputClass}>
              <option value="normale">Normale</option>
              <option value="alta">Alta</option>
            </select>
          </Field>
        </div>

        <Field label="Foto e documenti">
          <input
            type="file"
            accept={ACCEPT}
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-1 text-[11px] text-ink-faint">
            Fino a 6 file, max 8 MB ciascuno. Foto, PDF, Word, Excel.
          </p>
          {previews.length > 0 && (
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
        </Field>

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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-ink-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
