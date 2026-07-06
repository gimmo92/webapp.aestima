// Badge di confidenza della classificazione: verde (alta), ambra (media),
// rosso (bassa). Mostra la percentuale.

function tone(confidence: number): { color: string; label: string } {
  if (confidence >= 0.85) return { color: "#2ea043", label: "alta" };
  if (confidence >= 0.7) return { color: "#d29922", label: "media" };
  return { color: "#f85149", label: "bassa" };
}

export function ConfidenceBadge({
  confidence,
  showLabel = false,
}: {
  confidence: number;
  showLabel?: boolean;
}) {
  const t = tone(confidence);
  const pct = Math.round(confidence * 100);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums"
      style={{ color: t.color, backgroundColor: `${t.color}1f` }}
      title={`Confidenza ${t.label}`}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.35" />
        <path
          d="M12 3a9 9 0 0 1 9 9"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {pct}%{showLabel ? ` · ${t.label}` : ""}
    </span>
  );
}
