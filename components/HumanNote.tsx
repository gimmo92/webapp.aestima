// Messaggio ricorrente: l'umano approva sempre, nessun invio automatico.

export function HumanNote({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border border-border bg-surface-2/60 px-3.5 py-2.5 text-sm text-ink-muted ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0 text-brand"
      >
        <path
          d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M4 20a8 8 0 0 1 16 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span>
        <span className="font-semibold text-ink">
          L&apos;approvazione finale resta al tecnico.
        </span>{" "}
        aestima prepara tutto, ma nessun preventivo parte senza il tuo via.
      </span>
    </div>
  );
}
