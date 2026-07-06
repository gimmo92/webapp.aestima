"use client";

import { useEffect, useState } from "react";

// STEP 2 — Animazione di elaborazione dell'agente.
// Mostra gli step "cognitivi" dell'agente in sequenza mentre in
// parallelo gira la vera chiamata a /api/analyze.

const AGENT_STEPS = [
  "Interpreto la richiesta",
  "Identifico la macchina",
  "Cerco nella distinta base",
  "Identifico il componente",
  "Calcolo il prezzo",
];

interface Props {
  /** true quando la chiamata API di fondo è terminata. */
  apiDone: boolean;
  /** Callback invocata quando l'animazione ha completato tutti gli step. */
  onComplete: () => void;
  /** Sorgente dell'analisi (per mostrare "Claude" o "demo locale"). */
  source?: "anthropic" | "mock";
}

export function ProcessingAnimation({ apiDone, onComplete, source }: Props) {
  const [active, setActive] = useState(0);

  // Avanza gli step di UI a intervalli regolari.
  useEffect(() => {
    if (active >= AGENT_STEPS.length) return;
    const t = setTimeout(() => setActive((s) => s + 1), 750);
    return () => clearTimeout(t);
  }, [active]);

  // Completa solo quando sia l'animazione che l'API sono pronte.
  useEffect(() => {
    if (active >= AGENT_STEPS.length && apiDone) {
      const t = setTimeout(onComplete, 450);
      return () => clearTimeout(t);
    }
  }, [active, apiDone, onComplete]);

  return (
    <section className="animate-fade-up rounded-2xl border border-border bg-surface p-6 shadow-xl shadow-black/30 sm:p-10">
      <div className="flex flex-col items-center text-center">
        {/* Nucleo animato dell'agente */}
        <div className="relative mb-7 flex h-20 w-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-brand/30 [animation:pulse-ring_1.8s_ease-out_infinite]" />
          <span className="absolute inset-0 rounded-full bg-brand/20 [animation:pulse-ring_1.8s_ease-out_infinite_0.6s]" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-brand/50 bg-brand-soft">
            <svg
              width="30"
              height="30"
              viewBox="0 0 24 24"
              fill="none"
              className="text-brand"
              aria-hidden="true"
            >
              <path
                d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5-1.4 1.4M7.9 16.1l-1.4 1.4m11 0-1.4-1.4M7.9 7.9 6.5 6.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="12"
                r="3.2"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-xl font-bold text-ink sm:text-2xl">
          L&apos;agente sta lavorando…
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          {source === "anthropic"
            ? "Analisi in corso con Claude (Anthropic)"
            : "Analisi della richiesta in linguaggio naturale"}
        </p>

        {/* Lista degli step */}
        <ul className="mt-7 w-full max-w-md space-y-2 text-left">
          {AGENT_STEPS.map((label, i) => {
            const done = i < active;
            const current = i === active;
            return (
              <li
                key={label}
                className={[
                  "flex items-center gap-3 rounded-lg border px-4 py-3 transition-all duration-300",
                  done
                    ? "border-border bg-surface-2/60"
                    : current
                      ? "border-brand/50 bg-brand-soft"
                      : "border-transparent opacity-40",
                ].join(" ")}
              >
                <StepIcon done={done} current={current} />
                <span
                  className={[
                    "text-sm font-medium",
                    done
                      ? "text-ink-muted"
                      : current
                        ? "text-ink"
                        : "text-ink-faint",
                  ].join(" ")}
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function StepIcon({ done, current }: { done: boolean; current: boolean }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand">
        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 10.5 8 14.5 16 5.5"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (current) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-ink-faint" />
    </span>
  );
}
