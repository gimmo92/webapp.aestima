"use client";

import type { QuickReplyOption } from "@/lib/serviceChatTypes";

interface Props {
  options: QuickReplyOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

/** Pill cliccabili sotto un messaggio agente — ben visibili su proiettore. */
export function QuickReplyBubbles({ options, onSelect, disabled }: Props) {
  return (
    <div
      className="mt-4 flex flex-wrap gap-2.5 border-t border-border/60 pt-4"
      role="group"
      aria-label="Risposte rapide suggerite"
    >
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(opt.value)}
          className={[
            "inline-flex items-center rounded-full border-2 px-4 py-2.5 text-sm font-semibold transition-all",
            "border-brand/50 bg-brand-soft text-brand shadow-sm",
            "hover:border-brand hover:bg-brand/20 hover:shadow-md hover:shadow-brand/10",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
            "disabled:cursor-not-allowed disabled:opacity-40",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
