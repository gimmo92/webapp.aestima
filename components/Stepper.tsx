"use client";

import { useI18n } from "@/lib/i18n";

// Indicatore di avanzamento del flusso a step.

export function Stepper({ current }: { current: number }) {
  const { t } = useI18n();
  const steps = [
    { id: 1, label: t("stepper.request") },
    { id: 2, label: t("stepper.analysis") },
    { id: 3, label: t("stepper.part") },
    { id: 4, label: t("stepper.quote") },
  ];
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, i) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex items-center gap-2.5">
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold transition-colors",
                  isActive
                    ? "border-brand bg-brand text-white shadow-[0_0_0_4px_var(--color-brand-soft)]"
                    : isDone
                      ? "border-brand/50 bg-brand-soft text-brand"
                      : "border-border bg-surface text-ink-faint",
                ].join(" ")}
              >
                {isDone ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 10.5 8 14.5 16 5.5"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <span
                className={[
                  "hidden text-sm font-medium sm:inline",
                  isActive
                    ? "text-ink"
                    : isDone
                      ? "text-ink-muted"
                      : "text-ink-faint",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={[
                  "mx-2 h-px w-6 sm:w-12",
                  step.id < current ? "bg-brand/50" : "bg-border",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
