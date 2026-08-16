"use client";

import { useInbox } from "@/components/inbox/InboxProvider";
import { TICKET_STATUS_BY_ID } from "@/lib/ticketData";
import type { TicketStatus } from "@/lib/ticketTypes";

export function TicketStatusPill({
  status,
  compact,
}: {
  status: TicketStatus;
  compact?: boolean;
}) {
  const { ticketStages } = useInbox();
  const cfg =
    ticketStages.find((s) => s.id === status) ?? TICKET_STATUS_BY_ID[status];
  const color = cfg?.color ?? "#9fb0c3";
  const label = cfg?.label ?? status;

  if (compact) {
    return (
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        title={label}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ color, backgroundColor: `${color}1f` }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
