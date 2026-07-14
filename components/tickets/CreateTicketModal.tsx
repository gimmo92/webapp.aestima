"use client";

import { useState } from "react";
import type {
  CreateTicketInput,
  TicketCategory,
  TicketPriority,
} from "@/lib/ticketTypes";

interface Props {
  onClose: () => void;
  onCreate: (input: CreateTicketInput) => void;
}

export function CreateTicketModal({ onClose, onCreate }: Props) {
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [machineModel, setMachineModel] = useState("");
  const [machineSerial, setMachineSerial] = useState("");
  const [category, setCategory] = useState<TicketCategory>("altro");
  const [priority, setPriority] = useState<TicketPriority>("normale");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary.trim()) return;
    onCreate({
      summary: summary.trim(),
      description: description.trim() || summary.trim(),
      machineModel: machineModel.trim() || undefined,
      machineSerial: machineSerial.trim() || undefined,
      category,
      priority,
      source: "manuale",
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Nuovo ticket</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Chiudi"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6 6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">
          <Field label="Oggetto *">
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className={inputClass}
              placeholder="Breve descrizione del problema"
              required
            />
          </Field>
          <Field label="Descrizione">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className={inputClass}
              placeholder="Dettagli, sintomi, codici citati…"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Modello macchina">
              <input
                value={machineModel}
                onChange={(e) => setMachineModel(e.target.value)}
                className={inputClass}
                placeholder="Es. Rettificatrice RX-400"
              />
            </Field>
            <Field label="Matricola">
              <input
                value={machineSerial}
                onChange={(e) => setMachineSerial(e.target.value)}
                className={inputClass}
                placeholder="Es. MX-4521"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Categoria">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className={inputClass}
              >
                <option value="ricambio">Ricambio</option>
                <option value="troubleshooting">Troubleshooting</option>
                <option value="altro">Altro</option>
              </select>
            </Field>
            <Field label="Priorità">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className={inputClass}
              >
                <option value="normale">Normale</option>
                <option value="alta">Alta</option>
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-ink-muted hover:text-ink"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!summary.trim()}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-40"
            >
              Crea ticket
            </button>
          </div>
        </form>
      </div>
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
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";
