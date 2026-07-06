import type { Label } from "@/lib/inboxTypes";

// Chip di etichetta custom, colore inline. Opzionale pulsante di rimozione.

export function LabelChip({
  label,
  onRemove,
}: {
  label: Label;
  onRemove?: () => void;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ color: label.color, backgroundColor: `${label.color}1f` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: label.color }}
      />
      {label.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label={`Rimuovi ${label.name}`}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M3 3l6 6M9 3l-6 6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
