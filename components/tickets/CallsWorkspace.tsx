"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { Customer } from "@/lib/customerTypes";
import {
  matchCustomer,
  phonesMatch,
  ticketBelongsToCaller,
  type CallerRef,
} from "@/lib/telephony/phone";
import type { PhoneCallRecord } from "@/lib/telephony/types";
import type { ServiceTicketRecord } from "@/lib/ticketTypes";
import { useI18n } from "@/lib/i18n";
import { TicketStatusPill } from "./TicketStatusPill";

type Outcome = PhoneCallRecord["outcome"];

const OUTCOME_KEY = {
  answered: "tickets.callLog.answered",
  missed: "tickets.callLog.missed",
  voicemail: "tickets.callLog.voicemail",
} as const;

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(sec: number | null): string {
  if (sec == null) return "—";
  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes} min ${String(seconds).padStart(2, "0")} s`;
}

function callerRef(customer: Customer | null): CallerRef | null {
  if (!customer) return null;
  return {
    id: customer.id,
    name: customer.name,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
  };
}

function callSummary(
  call: PhoneCallRecord,
  ticket: ServiceTicketRecord | null
): string | null {
  const fromChoice = ticket?.operatorChoice?.summary?.trim();
  if (fromChoice) return fromChoice;
  const fromAi = ticket?.aiProposal?.summary?.trim();
  if (fromAi) return fromAi;
  const fromTicket = ticket?.summary?.trim();
  if (
    fromTicket &&
    !/^chiamata da /i.test(fromTicket) &&
    !/^da richiamare/i.test(fromTicket)
  ) {
    return fromTicket;
  }
  const transcript = call.transcript?.trim();
  if (transcript) {
    const sentence = transcript.split(/(?<=[.!?])\s+/)[0] ?? transcript;
    return sentence.length > 220 ? `${sentence.slice(0, 217)}…` : sentence;
  }
  return fromTicket || null;
}

type CommessaRow = {
  number: string;
  product: string | null;
  ticketId: string;
  summary: string;
  status: string;
};

function collectCommesse(tickets: ServiceTicketRecord[]): CommessaRow[] {
  const rows: CommessaRow[] = [];
  const seen = new Set<string>();
  for (const ticket of tickets) {
    const product =
      ticket.operatorChoice?.product ||
      ticket.aiProposal?.product ||
      ticket.machineModel ||
      null;
    const numbers = [
      ticket.operatorChoice?.orderNumber,
      ticket.aiProposal?.orderNumber,
      ticket.machineSerial,
    ];
    for (const raw of numbers) {
      const number = raw?.trim();
      if (!number) continue;
      const key = number.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        number,
        product,
        ticketId: ticket.id,
        summary: ticket.summary,
        status: ticket.status,
      });
    }
  }
  return rows;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  );
}

export function CallsWorkspace() {
  const { phoneCalls, tickets, customers } = useInbox();
  const { t, dateLocale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deepLinkId = searchParams.get("id");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(deepLinkId);
  const [showCustomer, setShowCustomer] = useState(false);

  useEffect(() => {
    if (deepLinkId && phoneCalls.some((call) => call.id === deepLinkId)) {
      setSelectedId(deepLinkId);
      return;
    }
    setSelectedId((current) => {
      if (current && phoneCalls.some((call) => call.id === current)) return current;
      return phoneCalls[0]?.id ?? null;
    });
  }, [deepLinkId, phoneCalls]);

  const ticketById = useMemo(
    () => new Map(tickets.map((ticket) => [ticket.id, ticket])),
    [tickets]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return phoneCalls;
    return phoneCalls.filter((call) => {
      const ticket = call.ticketId ? ticketById.get(call.ticketId) ?? null : null;
      const customer =
        (ticket?.customerId
          ? customers.find((item) => item.id === ticket.customerId)
          : null) ?? matchCustomer(call.phone, customers);
      const summary = callSummary(call, ticket) ?? "";
      const haystack = [
        call.phone,
        call.operatorName,
        call.transcript,
        summary,
        customer?.name,
        customer?.contactName,
        customer?.email,
        ticket?.customerName,
        ticket?.customerCompany,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [phoneCalls, query, ticketById, customers]);

  const selected =
    filtered.find((call) => call.id === selectedId) ?? filtered[0] ?? null;

  const selectCall = (id: string) => {
    setSelectedId(id);
    setShowCustomer(false);
    router.replace(`/ticket/chiamate?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface/40">
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-sm font-semibold text-ink">{t("tickets.callLog.title")}</h1>
          <p className="text-xs text-ink-faint">
            {phoneCalls.length === 1
              ? t("tickets.callLog.countOne", { n: phoneCalls.length })
              : t("tickets.callLog.countMany", { n: phoneCalls.length })}
            {" · "}
            {t("tickets.callLog.hint")}
          </p>
          <div className="relative mt-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("tickets.callLog.search")}
              className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-faint">
              {phoneCalls.length === 0
                ? t("tickets.callLog.empty")
                : t("tickets.callLog.noMatch")}
            </p>
          ) : (
            <ul>
              {filtered.map((call) => {
                const ticket = call.ticketId
                  ? ticketById.get(call.ticketId) ?? null
                  : null;
                const customer =
                  (ticket?.customerId
                    ? customers.find((item) => item.id === ticket.customerId)
                    : null) ?? matchCustomer(call.phone, customers);
                const name =
                  customer?.contactName ||
                  customer?.name ||
                  ticket?.customerName ||
                  call.phone;
                const summary = callSummary(call, ticket);
                const active = selected?.id === call.id;
                return (
                  <li key={call.id}>
                    <button
                      type="button"
                      onClick={() => selectCall(call.id)}
                      className={[
                        "flex w-full flex-col gap-1 border-b border-border/70 px-4 py-3 text-left transition-colors",
                        active
                          ? "bg-brand-soft"
                          : "hover:bg-surface-2/70",
                      ].join(" ")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {name}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-faint">
                          {formatWhen(call.occurredAt, dateLocale)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-[11px] text-ink-muted">
                        <OutcomeBadge outcome={call.outcome} label={t(OUTCOME_KEY[call.outcome])} />
                        <span className="truncate">{call.phone}</span>
                      </span>
                      {summary && (
                        <span className="line-clamp-2 text-xs text-ink-muted">
                          {summary}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      <section className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        {!selected ? (
          <p className="px-6 py-16 text-center text-sm text-ink-faint">
            {t("tickets.callLog.select")}
          </p>
        ) : showCustomer ? (
          <CustomerDossier
            call={selected}
            tickets={tickets}
            phoneCalls={phoneCalls}
            customers={customers}
            onBack={() => setShowCustomer(false)}
          />
        ) : (
          <CallDetail
            call={selected}
            ticket={
              selected.ticketId ? ticketById.get(selected.ticketId) ?? null : null
            }
            customers={customers}
            onOpenCustomer={() => setShowCustomer(true)}
          />
        )}
      </section>
    </div>
  );
}

function OutcomeBadge({
  outcome,
  label,
}: {
  outcome: Outcome;
  label: string;
}) {
  const tone =
    outcome === "missed"
      ? "bg-danger/15 text-danger"
      : outcome === "voicemail"
        ? "bg-surface-2 text-ink-muted"
        : "bg-brand/15 text-brand";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function CallDetail({
  call,
  ticket,
  customers,
  onOpenCustomer,
}: {
  call: PhoneCallRecord;
  ticket: ServiceTicketRecord | null;
  customers: Customer[];
  onOpenCustomer: () => void;
}) {
  const { t, dateLocale } = useI18n();
  const customer =
    (ticket?.customerId
      ? customers.find((item) => item.id === ticket.customerId)
      : null) ?? matchCustomer(call.phone, customers);
  const summary = callSummary(call, ticket);
  const displayName =
    customer?.contactName ||
    customer?.name ||
    ticket?.customerName ||
    call.phone;
  const company =
    customer && customer.contactName ? customer.name : ticket?.customerCompany;

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-faint">
            {call.direction === "inbound"
              ? t("tickets.callLog.inbound")
              : t("tickets.callLog.outbound")}
            {" · "}
            {formatWhen(call.occurredAt, dateLocale)}
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">{displayName}</h2>
          <p className="mt-1 text-sm text-ink-muted">{call.phone}</p>
        </div>
        <OutcomeBadge
          outcome={call.outcome}
          label={t(OUTCOME_KEY[call.outcome])}
        />
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-base/60 p-4 sm:grid-cols-3">
        <Field label={t("tickets.callLog.duration")}>
          {formatDuration(call.durationSec)}
        </Field>
        <Field label={t("tickets.callLog.operator")}>
          {call.operatorName?.trim() || "—"}
        </Field>
        <Field label={t("tickets.callLog.linkedTicket")}>
          {ticket ? (
            <Link
              href={`/ticket/lista?id=${encodeURIComponent(ticket.id)}`}
              className="font-mono text-sm font-semibold text-brand hover:underline"
            >
              #{ticket.id}
            </Link>
          ) : (
            "—"
          )}
        </Field>
      </div>

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.callLog.summary")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">
          {summary || t("tickets.callLog.noSummary")}
        </p>
      </section>

      <button
        type="button"
        onClick={onOpenCustomer}
        className="w-full rounded-xl border border-border bg-base/60 p-4 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {t("tickets.callLog.customer")}
          </span>
          <span className="text-xs font-semibold text-brand">
            {t("tickets.callLog.openCustomer")}
          </span>
        </span>
        <span className="mt-2 block text-sm font-semibold text-ink">{displayName}</span>
        {company && company !== displayName && (
          <span className="mt-0.5 block text-sm text-ink-muted">{company}</span>
        )}
        <span className="mt-2 grid gap-1 text-xs text-ink-muted sm:grid-cols-2">
          <span>{customer?.email || ticket?.customerEmail || "—"}</span>
          <span>{customer?.phone || call.phone}</span>
          <span>{customer?.city || "—"}</span>
          <span>
            {customer ? customer.vat || "—" : t("tickets.callLog.unknown")}
          </span>
        </span>
      </button>

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {t("tickets.callLog.transcript")}
          </p>
          {call.recordingUrl && (
            <a
              href={call.recordingUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-brand hover:underline"
            >
              {t("tickets.callLog.recording")}
            </a>
          )}
        </div>
        {call.transcript?.trim() ? (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">
            {call.transcript.trim()}
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-faint">
            {t("tickets.callLog.noTranscript")}
          </p>
        )}
      </section>
    </div>
  );
}

function CustomerDossier({
  call,
  tickets,
  phoneCalls,
  customers,
  onBack,
}: {
  call: PhoneCallRecord;
  tickets: ServiceTicketRecord[];
  phoneCalls: PhoneCallRecord[];
  customers: Customer[];
  onBack: () => void;
}) {
  const { t, dateLocale } = useI18n();
  const linked = call.ticketId
    ? tickets.find((ticket) => ticket.id === call.ticketId) ?? null
    : null;
  const customer =
    (linked?.customerId
      ? customers.find((item) => item.id === linked.customerId)
      : null) ?? matchCustomer(call.phone, customers);
  const displayName =
    customer?.contactName ||
    customer?.name ||
    linked?.customerName ||
    call.phone;
  const company =
    customer && customer.contactName ? customer.name : linked?.customerCompany;

  const history = useMemo(() => {
    const ref = callerRef(customer);
    return tickets
      .filter((ticket) => ticketBelongsToCaller(ticket, call.phone, ref))
      .slice()
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [tickets, call.phone, customer]);

  const commesse = useMemo(() => collectCommesse(history), [history]);

  const relatedCalls = useMemo(() => {
    const ticketIds = new Set(history.map((ticket) => ticket.id));
    return phoneCalls.filter((item) => {
      if (item.id === call.id) return true;
      if (phonesMatch(item.phone, call.phone)) return true;
      if (customer?.phone && phonesMatch(item.phone, customer.phone)) return true;
      return Boolean(item.ticketId && ticketIds.has(item.ticketId));
    });
  }, [phoneCalls, history, call, customer]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      <button
        type="button"
        onClick={onBack}
        className="text-xs font-semibold text-brand hover:underline"
      >
        ← {t("tickets.callLog.back")}
      </button>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.callLog.customer")}
        </p>
        <h2 className="mt-1 text-xl font-bold text-ink">{displayName}</h2>
        {company && company !== displayName && (
          <p className="text-sm text-ink-muted">{company}</p>
        )}
        {!customer && (
          <p className="mt-1 text-xs text-ink-faint">{t("tickets.callLog.unknown")}</p>
        )}
      </div>

      <div className="grid gap-3 rounded-xl border border-border bg-base/60 p-4 sm:grid-cols-2">
        <Field label={t("tickets.callLog.contact")}>
          {customer?.contactName || linked?.customerName || "—"}
        </Field>
        <Field label={t("tickets.callLog.phone")}>
          {customer?.phone || call.phone}
        </Field>
        <Field label={t("tickets.callLog.email")}>
          {customer?.email || linked?.customerEmail || "—"}
        </Field>
        <Field label={t("tickets.callLog.city")}>{customer?.city || "—"}</Field>
        <Field label={t("tickets.callLog.address")}>
          {customer?.address || "—"}
        </Field>
        <Field label={t("tickets.callLog.vat")}>{customer?.vat || "—"}</Field>
        {customer?.notes && (
          <div className="sm:col-span-2">
            <Field label={t("tickets.callLog.notes")}>{customer.notes}</Field>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.callLog.orders")}
        </p>
        {commesse.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">{t("tickets.callLog.noOrders")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-border/70">
            {commesse.map((row) => (
              <li key={row.number} className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-mono text-sm font-semibold text-ink">{row.number}</p>
                  {row.product && (
                    <p className="text-xs text-ink-muted">
                      {t("tickets.callLog.product")}: {row.product}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-ink-faint">{row.summary}</p>
                </div>
                <div className="flex items-center gap-2">
                  <TicketStatusPill status={row.status} />
                  <Link
                    href={`/ticket/lista?id=${encodeURIComponent(row.ticketId)}`}
                    className="font-mono text-xs font-semibold text-brand hover:underline"
                  >
                    #{row.ticketId}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.callLog.history")}
        </p>
        {history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">{t("tickets.callLog.noHistory")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {history.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/ticket/lista?id=${encodeURIComponent(ticket.id)}`}
                  className="flex items-start justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-2/70"
                >
                  <span>
                    <span className="font-mono text-xs font-semibold text-brand">
                      #{ticket.id}
                    </span>{" "}
                    <span className="text-sm text-ink">{ticket.summary}</span>
                    <span className="mt-0.5 block text-xs text-ink-faint">
                      {ticket.createdFull}
                    </span>
                  </span>
                  <TicketStatusPill status={ticket.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.callLog.otherCalls")}
        </p>
        <ul className="mt-3 space-y-2">
          {relatedCalls.map((item) => (
            <li key={item.id} className="text-sm text-ink-muted">
              <p className="text-ink">
                {item.direction === "inbound"
                  ? t("tickets.callLog.inbound")
                  : t("tickets.callLog.outbound")}
                {" · "}
                {item.phone}
                {" · "}
                {t(OUTCOME_KEY[item.outcome])}
              </p>
              <p className="text-xs text-ink-faint">
                {formatWhen(item.occurredAt, dateLocale)}
                {item.id === call.id ? ` · ${t("tickets.callLog.thisCall")}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
