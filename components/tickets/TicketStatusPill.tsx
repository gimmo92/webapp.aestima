import { TICKET_STATUS_BY_ID } from "@/lib/ticketData";
import type { TicketStatus } from "@/lib/ticketTypes";

export function TicketStatusPill({
  status,
  compact,
}: {
  status: TicketStatus;
  compact?: boolean;
}) {
  const cfg = TICKET_STATUS_BY_ID[status];
  if (compact) {
    return (
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: cfg.color }}
        title={cfg.label}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
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
