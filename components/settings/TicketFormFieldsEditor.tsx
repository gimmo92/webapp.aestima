"use client";

import { useInbox } from "@/components/inbox/InboxProvider";
import {
  DEFAULT_TICKET_FORM,
  newCustomFieldId,
  type TicketFormField,
  type TicketFormFieldType,
} from "@/lib/ticketForm";

export function TicketFormFieldsEditor() {
  const { ticketForm, setTicketForm } = useInbox();

  const patchField = (index: number, part: Partial<TicketFormField>) => {
    setTicketForm((prev) => ({
      ...prev,
      fields: prev.fields.map((f, i) => (i === index ? { ...f, ...part } : f)),
    }));
  };

  const move = (index: number, dir: -1 | 1) => {
    setTicketForm((prev) => {
      const next = [...prev.fields];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, fields: next };
    });
  };

  const addField = (type: TicketFormFieldType) => {
    const id = newCustomFieldId();
    setTicketForm((prev) => ({
      ...prev,
      fields: [
        ...prev.fields,
        {
          id,
          key: id,
          label: type === "textarea" ? "Note" : "Nuovo campo",
          type,
          enabled: true,
          required: false,
          builtIn: false,
        },
      ],
    }));
  };

  const remove = (index: number) => {
    setTicketForm((prev) => {
      const field = prev.fields[index];
      if (field.builtIn) return prev;
      return {
        ...prev,
        fields: prev.fields.filter((_, i) => i !== index),
      };
    });
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-ink">Campi del form</h3>
      <p className="mt-1 text-xs text-ink-faint">
        Puoi rinominare, nascondere, rendere obbligatori e riordinare i campi.
        I campi custom si possono anche eliminare.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-ink-muted">
          Titolo
          <input
            value={ticketForm.title}
            onChange={(e) =>
              setTicketForm((prev) => ({ ...prev, title: e.target.value }))
            }
            className="mt-1 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <label className="block text-sm text-ink-muted sm:col-span-2">
          Testo introduttivo
          <textarea
            value={ticketForm.intro}
            onChange={(e) =>
              setTicketForm((prev) => ({ ...prev, intro: e.target.value }))
            }
            rows={2}
            className="mt-1 w-full resize-none rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {ticketForm.fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-xl border border-border bg-surface/60 p-3"
          >
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === ticketForm.fields.length - 1}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                >
                  ↓
                </button>
              </div>
              <input
                value={field.label}
                onChange={(e) => patchField(index, { label: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-border bg-base px-3 py-1.5 text-sm text-ink outline-none focus:border-brand"
              />
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-wider text-ink-faint">
                {field.builtIn ? field.key : field.type}
              </span>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={field.enabled}
                  onChange={(e) => patchField(index, { enabled: e.target.checked })}
                />
                Visibile
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={!field.enabled}
                  onChange={(e) => patchField(index, { required: e.target.checked })}
                />
                Obbligatorio
              </label>
              {!field.builtIn && (
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Elimina
                </button>
              )}
            </div>
            {(field.type === "text" ||
              field.type === "email" ||
              field.type === "tel" ||
              field.type === "textarea") && (
              <input
                value={field.placeholder ?? ""}
                onChange={(e) => patchField(index, { placeholder: e.target.value })}
                placeholder="Placeholder"
                className="mt-2 w-full rounded-lg border border-border bg-base px-3 py-1.5 text-xs text-ink outline-none focus:border-brand"
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addField("text")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          Aggiungi campo testo
        </button>
        <button
          type="button"
          onClick={() => addField("textarea")}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          Aggiungi area testo
        </button>
        <button
          type="button"
          onClick={() => setTicketForm(DEFAULT_TICKET_FORM)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink-muted hover:text-ink"
        >
          Ripristina default
        </button>
      </div>
    </div>
  );
}
