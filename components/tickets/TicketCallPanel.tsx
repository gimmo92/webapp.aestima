"use client";

import type { Customer } from "@/lib/customerTypes";
import {
  matchCustomer,
  phonesMatch,
  ticketBelongsToCaller,
} from "@/lib/telephony/phone";
import type { PhoneCallRecord } from "@/lib/telephony/types";
import type { ServiceTicketRecord } from "@/lib/ticketTypes";
import { terminalStageIds } from "@/lib/ticketData";
import type { TicketStage } from "@/lib/ticketTypes";
import { useInbox } from "@/components/inbox/InboxProvider";
import { assignTicketLabel, routeTextToDepartment } from "@/lib/departmentFromText";
import { useI18n } from "@/lib/i18n";

const OUTCOME_LABEL = {
  answered: "Risposta",
  missed: "Persa",
  voicemail: "Segreteria",
} as const;

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TicketCallPanel({
  ticket,
  tickets,
  phoneCalls,
  customers,
  stages,
  onOpenTicket,
  onAttach,
  onCreate,
}: {
  ticket: ServiceTicketRecord;
  tickets: ServiceTicketRecord[];
  phoneCalls: PhoneCallRecord[];
  customers: Customer[];
  stages: TicketStage[];
  onOpenTicket: (id: string) => void;
  onAttach: (callId: string, ticketId: string) => void;
  onCreate: (callId: string) => void;
}) {
  const { t } = useI18n();
  const { departments, telephonyRouting } = useInbox();
  const customer =
    customers.find((item) => item.id === ticket.customerId) ??
    matchCustomer(ticket.customerPhone ?? "", customers);
  const phone = ticket.customerPhone || customer?.phone || "";
  const linked = phoneCalls.filter((call) => call.ticketId === ticket.id);
  const terminal = terminalStageIds(stages);
  const isOpen = !terminal.includes(ticket.status);
  const pending = isOpen
    ? phoneCalls.filter(
        (call) =>
          !call.ticketId &&
          (phonesMatch(call.phone, phone) ||
            ticketBelongsToCaller(
              ticket,
              call.phone,
              matchCustomer(call.phone, customers)
            ))
      )
    : [];
  const previous = tickets.filter(
    (other) =>
      other.id !== ticket.id &&
      ticketBelongsToCaller(
        other,
        phone,
        customer
          ? {
              id: customer.id,
              name: customer.name,
              contactName: customer.contactName,
              phone: customer.phone,
            }
          : null
      )
  );

  if (linked.length === 0 && pending.length === 0 && previous.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {pending.map((call) => (
        <div
          key={call.id}
          className="rounded-xl border border-brand/40 bg-brand-soft/50 p-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
            Chiamata da agganciare
          </p>
          <p className="mt-1 text-sm text-ink">
            {call.phone} · {OUTCOME_LABEL[call.outcome]} · {formatWhen(call.occurredAt)}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {customer
              ? `${customer.contactName || customer.name}${customer.name && customer.contactName ? ` · ${customer.name}` : ""}`
              : "Numero già presente su questo ticket."}{" "}
            Puoi unirla a questo ticket oppure aprirne uno nuovo.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onAttach(call.id, ticket.id)}
              className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-strong"
            >
              Aggancia a questo ticket
            </button>
            <button
              type="button"
              onClick={() => onCreate(call.id)}
              className="rounded-lg border border-border bg-base px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink"
            >
              {assignTicketLabel(
                t,
                departments,
                routeTextToDepartment(
                  call.transcript ?? "",
                  telephonyRouting
                ).department
              )}
            </button>
          </div>
        </div>
      ))}

      {linked.length > 0 && (
        <section className="rounded-xl border border-border bg-base/60 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Chiamate
          </p>
          <ul className="space-y-3">
            {linked.map((call) => (
              <li key={call.id} className="text-sm text-ink-muted">
                <p className="text-ink">
                  {call.direction === "inbound" ? "In entrata" : "In uscita"} ·{" "}
                  {call.phone} · {OUTCOME_LABEL[call.outcome]}
                  {call.durationSec != null ? ` · ${call.durationSec} s` : ""}
                </p>
                <p className="text-xs text-ink-faint">
                  {formatWhen(call.occurredAt)}
                  {call.operatorName ? ` · ${call.operatorName}` : ""}
                </p>
                {call.recordingUrl && (
                  <a
                    href={call.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-medium text-brand hover:underline"
                  >
                    Registrazione
                  </a>
                )}
                {call.transcript && (
                  <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed">
                    {call.transcript}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {previous.length > 0 && (
        <section className="rounded-xl border border-border bg-base/60 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Ticket precedenti del cliente
          </p>
          <ul className="space-y-1.5">
            {previous.map((other) => (
              <li key={other.id}>
                <button
                  type="button"
                  onClick={() => onOpenTicket(other.id)}
                  className="text-left text-sm text-ink hover:text-brand"
                >
                  <span className="font-mono text-xs text-brand">#{other.id}</span>{" "}
                  {other.summary}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
