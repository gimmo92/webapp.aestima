"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { Customer } from "@/lib/customerTypes";
import { matchCustomer, ticketBelongsToCaller } from "@/lib/telephony/phone";
import type { ServiceTicketRecord } from "@/lib/ticketTypes";
import {
  previewOfMessage,
  WA_CHATS,
  type WaChat,
  type WaMessage,
} from "@/lib/whatsappData";
import { assignTicketLabel, routeTextToDepartment } from "@/lib/departmentFromText";
import { useI18n } from "@/lib/i18n";
import { TicketStatusPill } from "./TicketStatusPill";

function messageBody(message: WaMessage): string {
  if (message.kind === "audio") return message.transcript?.trim() || "";
  if (message.text?.trim()) return message.text.trim();
  if (message.fileName) return message.fileName;
  return "";
}

function chatSummary(chat: WaChat): string {
  const parts = chat.messages
    .filter((message) => message.direction === "in")
    .map(messageBody)
    .filter(Boolean);
  const text = parts.slice(0, 2).join(" ");
  if (!text) return chat.role;
  return text.length > 180 ? `${text.slice(0, 177)}…` : text;
}

function customerText(chat: WaChat): string {
  return chat.messages
    .filter((message) => message.direction === "in")
    .map(messageBody)
    .filter(Boolean)
    .join("\n");
}

function chatTranscript(chat: WaChat): string {
  return chat.messages
    .map((message) => {
      const who =
        message.direction === "out" ? "Service" : message.author || chat.name;
      const body = messageBody(message) || previewOfMessage(message);
      return `[${message.timeLabel}] ${who}: ${body}`;
    })
    .join("\n");
}

function linkedTicket(
  chat: WaChat,
  tickets: ServiceTicketRecord[]
): ServiceTicketRecord | undefined {
  const summary = chatSummary(chat);
  return tickets.find(
    (ticket) =>
      ticket.source === "whatsapp" &&
      (ticket.customerName === chat.name || ticket.summary === summary) &&
      (!chat.isGroup
        ? !ticket.customerPhone ||
          ticket.customerPhone === chat.phone ||
          ticket.customerName === chat.name
        : ticket.customerCompany === chat.company)
  );
}

export function WhatsAppInbox() {
  const { customers, tickets, createTicket, telephonyRouting } = useInbox();
  const { t } = useI18n();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(WA_CHATS[0]?.id ?? "");
  const [showHistory, setShowHistory] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WA_CHATS;
    return WA_CHATS.filter((chat) => {
      const haystack = [
        chat.name,
        chat.company,
        chat.phone,
        chat.machine,
        chat.role,
        chatSummary(chat),
        ...chat.messages.map(messageBody),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query]);

  const selected =
    filtered.find((chat) => chat.id === selectedId) ?? filtered[0] ?? null;

  const openTicket = (chat: WaChat) => {
    const existing = linkedTicket(chat, tickets);
    if (existing) {
      router.push(`/ticket/lista?id=${encodeURIComponent(existing.id)}`);
      return;
    }
    const customer = chat.isGroup
      ? null
      : matchCustomer(chat.phone, customers);
    const routed = routeTextToDepartment(customerText(chat), telephonyRouting);
    const id = createTicket({
      source: "whatsapp",
      category: routed.category,
      department: routed.department,
      summary: chatSummary(chat),
      description: chatTranscript(chat),
      machineModel: chat.machine,
      customerName: chat.name,
      customerPhone: chat.isGroup ? undefined : chat.phone,
      customerCompany: chat.company,
      customerId: customer?.id,
    });
    router.push(`/ticket/lista?id=${encodeURIComponent(id)}`);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface/40">
        <div className="border-b border-border px-4 py-4">
          <h1 className="text-sm font-semibold text-ink">
            {t("tickets.whatsappInbox.title")}
          </h1>
          <p className="text-xs text-ink-faint">
            {WA_CHATS.length === 1
              ? t("tickets.whatsappInbox.countOne", { n: WA_CHATS.length })
              : t("tickets.whatsappInbox.countMany", { n: WA_CHATS.length })}
            {" · "}
            {t("tickets.whatsappInbox.hint")}
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("tickets.whatsappInbox.search")}
            className="mt-3 w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-sm text-ink-faint">
              {t("tickets.whatsappInbox.noMatch")}
            </p>
          ) : (
            <ul>
              {filtered.map((chat) => {
                const active = selected?.id === chat.id;
                return (
                  <li key={chat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedId(chat.id);
                        setShowHistory(false);
                      }}
                      className={[
                        "flex w-full flex-col gap-1 border-b border-border/70 px-4 py-3 text-left transition-colors",
                        active ? "bg-brand-soft" : "hover:bg-surface-2/70",
                      ].join(" ")}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-ink">
                          {chat.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-faint">
                          {chat.lastLabel}
                        </span>
                      </span>
                      <span className="truncate text-[11px] text-ink-muted">
                        {chat.company || chat.role}
                        {chat.unread > 0
                          ? ` · ${chat.unread} ${t("tickets.whatsappInbox.unread")}`
                          : ""}
                      </span>
                      <span className="line-clamp-2 text-xs text-ink-muted">
                        {chatSummary(chat)}
                      </span>
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
            {t("tickets.whatsappInbox.select")}
          </p>
        ) : (
          <ChatDetail
            chat={selected}
            customers={customers}
            tickets={tickets}
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory((value) => !value)}
            onCreateTicket={() => openTicket(selected)}
            existingTicket={linkedTicket(selected, tickets)}
          />
        )}
      </section>
    </div>
  );
}

function ChatDetail({
  chat,
  customers,
  tickets,
  showHistory,
  onToggleHistory,
  onCreateTicket,
  existingTicket,
}: {
  chat: WaChat;
  customers: Customer[];
  tickets: ServiceTicketRecord[];
  showHistory: boolean;
  onToggleHistory: () => void;
  onCreateTicket: () => void;
  existingTicket?: ServiceTicketRecord;
}) {
  const { t } = useI18n();
  const { departments, telephonyRouting } = useInbox();
  const customer = chat.isGroup ? null : matchCustomer(chat.phone, customers);
  const summary = chatSummary(chat);
  const routed = routeTextToDepartment(customerText(chat), telephonyRouting);
  const assignLabel = assignTicketLabel(
    t,
    departments,
    existingTicket?.department || routed.department
  );
  const history = useMemo(() => {
    const ref = {
      id: customer?.id ?? chat.id,
      name: customer?.name || chat.company || chat.name,
      contactName: customer?.contactName || chat.name,
      phone: chat.isGroup ? customer?.phone : chat.phone,
    };
    return tickets.filter((ticket) =>
      ticketBelongsToCaller(ticket, chat.isGroup ? "" : chat.phone, ref)
    );
  }, [tickets, chat, customer]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-ink-faint">
            {chat.isGroup
              ? t("tickets.whatsappInbox.group")
              : t("tickets.whatsappInbox.title")}
            {" · "}
            {chat.lastLabel}
          </p>
          <h2 className="mt-1 text-xl font-bold text-ink">{chat.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {chat.company || chat.role}
          </p>
        </div>
        {existingTicket ? (
          <Link
            href={`/ticket/lista?id=${encodeURIComponent(existingTicket.id)}`}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {assignLabel} #{existingTicket.id}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onCreateTicket}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {assignLabel}
          </button>
        )}
      </div>

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.whatsappInbox.summary")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{summary}</p>
      </section>

      <button
        type="button"
        onClick={onToggleHistory}
        className="w-full rounded-xl border border-border bg-base/60 p-4 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {t("tickets.whatsappInbox.customer")}
          </span>
          <span className="text-xs font-semibold text-brand">
            {t("tickets.whatsappInbox.history")}
          </span>
        </span>
        <span className="mt-2 block text-sm font-semibold text-ink">
          {customer?.name || chat.company || chat.name}
        </span>
        <span className="mt-2 grid gap-1 text-xs text-ink-muted sm:grid-cols-2">
          <span>
            {t("tickets.whatsappInbox.phone")}: {chat.isGroup ? "—" : chat.phone}
          </span>
          <span>
            {t("tickets.whatsappInbox.role")}: {chat.role}
          </span>
          <span>
            {t("tickets.whatsappInbox.machine")}: {chat.machine || "—"}
          </span>
          <span>{customer?.email || customer?.city || chat.presence}</span>
        </span>
      </button>

      {showHistory && (
        <section className="rounded-xl border border-border bg-base/60 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            {t("tickets.whatsappInbox.history")}
          </p>
          {history.length === 0 ? (
            <p className="mt-2 text-sm text-ink-faint">
              {t("tickets.whatsappInbox.noHistory")}
            </p>
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
                    </span>
                    <TicketStatusPill status={ticket.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl border border-border bg-base/60 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {t("tickets.whatsappInbox.messages")}
        </p>
        <ul className="mt-3 space-y-3">
          {chat.messages.map((message) => (
            <li key={message.id} className="text-sm">
              {message.dayLabel && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {message.dayLabel}
                </p>
              )}
              <p className="text-xs text-ink-faint">
                {message.direction === "out"
                  ? t("tickets.whatsappInbox.service")
                  : message.author || chat.name}
                {" · "}
                {message.timeLabel}
                {message.kind === "audio"
                  ? ` · ${t("tickets.whatsappInbox.voice")}`
                  : message.kind === "image"
                    ? ` · ${t("tickets.whatsappInbox.photo")}`
                    : message.kind === "document"
                      ? ` · ${t("tickets.whatsappInbox.document")}`
                      : ""}
              </p>
              <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-ink">
                {messageBody(message) || previewOfMessage(message)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
