import { STATUS_BY_ID } from "@/lib/inboxData";
import type { RequestStatus } from "@/lib/inboxTypes";

// Badge di stato con pallino colorato. I colori sono inline (esadecimali)
// perché i colori dinamici non verrebbero generati dal purge di Tailwind.

export function StatusPill({
  status,
  size = "sm",
}: {
  status: RequestStatus;
  size?: "sm" | "xs";
}) {
  const cfg = STATUS_BY_ID[status];
  if (!cfg) return null;
  const pad = size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${pad}`}
      style={{ color: cfg.color, backgroundColor: `${cfg.color}1f` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

/** Solo il pallino colorato (per la lista). */
export function StatusDot({ status }: { status: RequestStatus }) {
  const cfg = STATUS_BY_ID[status];
  if (!cfg) return null;
  return (
    <span
      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: cfg.color }}
      title={cfg.label}
    />
  );
}
