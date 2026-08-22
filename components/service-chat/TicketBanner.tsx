"use client";

import Link from "next/link";
import type { ServiceTicket } from "@/lib/serviceChatTypes";
import { useI18n } from "@/lib/i18n";

/** Banner visibile quando l'agente apre un ticket per escalation umana. */
export function TicketBanner({ ticket }: { ticket: ServiceTicket }) {
  const { t } = useI18n();
  return (
    <div className="overflow-hidden rounded-xl border border-brand/40 bg-brand-soft">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/20 text-brand">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M9 12h6m-6 4h3m2 5H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l4.414 4.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {t("ticketBanner.created", { id: ticket.id })}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{ticket.summary}</p>
          <p className="mt-2 text-xs text-ink-faint">
            {t("ticketBanner.sla")}{" "}
            <Link
              href={`/ticket/lista?id=${encodeURIComponent(ticket.id)}`}
              className="font-medium text-brand hover:underline"
            >
              {t("ticketBanner.view")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
