"use client";

import { useRef, useState } from "react";
import { HumanNote } from "./HumanNote";

// STEP 1 — Input della richiesta cliente (testo libero + allegato simulato).

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function RequestInput({ value, onChange, onSubmit }: Props) {
  const [attachment, setAttachment] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <section className="animate-fade-up rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/30 sm:p-8">
      <div className="mb-5">
        <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Passo 1 — Richiesta del cliente
        </div>
        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          Incolla la richiesta così come arriva
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          Testo libero, vago, senza codici ricambio. Come una vera email o
          messaggio da un cliente.
        </p>
      </div>

      <label
        htmlFor="request"
        className="mb-2 block text-sm font-medium text-ink-muted"
      >
        Testo della richiesta
      </label>
      <textarea
        id="request"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Es: Buongiorno, si è rotto il componente di tenuta sulla macchina comprata nel 2019, matricola MX-4521. Ci serve un preventivo urgente."
        className="w-full resize-none rounded-xl border border-border bg-base px-4 py-3.5 text-[0.95rem] leading-relaxed text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
      />

      {/* Allegato simulato (foto del pezzo/targhetta) */}
      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setAttachment(f ? f.name : null);
          }}
        />
        {attachment ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3.5 py-2.5 text-sm">
            <span className="flex items-center gap-2 text-ink-muted">
              <ImageIcon />
              <span className="text-ink">{attachment}</span>
              <span className="text-ink-faint">(allegato simulato)</span>
            </span>
            <button
              onClick={() => {
                setAttachment(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-ink-faint transition-colors hover:text-danger"
            >
              Rimuovi
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-base/50 px-4 py-3 text-sm text-ink-muted transition-colors hover:border-brand/60 hover:text-ink"
          >
            <PaperclipIcon />
            Allega una foto del pezzo o della targhetta (opzionale)
          </button>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <HumanNote className="flex-1" />
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="group inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-[0.95rem] font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
        >
          Analizza richiesta
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="transition-transform group-hover:translate-x-0.5"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </section>
  );
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
      <path
        d="m3 17 5-5 4 4 3-3 6 6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.3 3.3 0 0 1 4.7 4.7l-8 8a1.6 1.6 0 0 1-2.3-2.3l7.3-7.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
