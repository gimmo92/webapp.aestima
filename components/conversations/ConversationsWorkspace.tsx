"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useInbox } from "@/components/inbox/InboxProvider";
import { SparePartCardList } from "@/components/service-chat/SparePartCard";
import { TicketBanner } from "@/components/service-chat/TicketBanner";
import {
  CONVERSATION_CHANNEL_LABELS,
  CONVERSATION_FILTERS,
  CURRENT_OPERATOR,
  type ConversationFilter,
} from "@/lib/conversationData";
import type {
  ConversationRecord,
  StoredConversationMessage,
} from "@/lib/conversationTypes";

export function ConversationsWorkspace() {
  const {
    conversations,
    takeOverConversation,
    resolveConversation,
    appendConversationMessage,
  } = useInbox();

  const [filter, setFilter] = useState<ConversationFilter>("non_assegnate");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    conversations[0]?.id ?? null
  );

  const counts = useMemo(
    () => ({
      non_assegnate: conversations.filter(
        (c) => c.status === "aperto" && c.assignee === "ai"
      ).length,
      miei_aperti: conversations.filter(
        (c) =>
          c.status === "aperto" &&
          c.assignee === "operatore" &&
          c.assignedOperatorId === CURRENT_OPERATOR.id
      ).length,
      risolte: conversations.filter((c) => c.status === "risolto").length,
      tutte: conversations.length,
    }),
    [conversations]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      if (filter === "non_assegnate") {
        if (c.status !== "aperto" || c.assignee !== "ai") return false;
      } else if (filter === "miei_aperti") {
        if (
          c.status !== "aperto" ||
          c.assignee !== "operatore" ||
          c.assignedOperatorId !== CURRENT_OPERATOR.id
        )
          return false;
      } else if (filter === "risolte") {
        if (c.status !== "risolto") return false;
      }
      if (q) {
        const haystack =
          `${c.customerName} ${c.customerEmail ?? ""} ${c.lastMessagePreview}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [conversations, filter, query]);

  const selected =
    filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null;

  const filterLabel =
    CONVERSATION_FILTERS.find((f) => f.id === filter)?.label ?? "Conversazioni";

  let lastSection: string | undefined;
  const sidebarItems = CONVERSATION_FILTERS.map((item) => {
    const showSection = item.section && item.section !== lastSection;
    if (item.section) lastSection = item.section;
    return { ...item, showSection };
  });

  return (
    <div className="flex min-h-0 flex-1">
      {/* Sidebar filtri */}
      <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-surface/60">
        <div className="border-b border-border px-4 py-4">
          <h2 className="text-sm font-bold text-ink">Conversazioni</h2>
          <p className="text-xs text-ink-faint">Inbox live chat</p>
        </div>

        <div className="p-3">
          <div className="relative">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="m20 20-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca conversazioni…"
              className="w-full rounded-lg border border-border bg-base py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          {sidebarItems.map((item) => (
            <div key={item.id}>
              {item.showSection && (
                <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  {item.section}
                </p>
              )}
              <button
                onClick={() => {
                  setFilter(item.id);
                  setSelectedId(null);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  filter === item.id
                    ? "bg-brand-soft font-medium text-ink"
                    : "text-ink-muted hover:bg-surface-2/70 hover:text-ink",
                ].join(" ")}
              >
                <span>{item.label}</span>
                <span
                  className={[
                    "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-semibold",
                    filter === item.id
                      ? "bg-brand/20 text-brand"
                      : "bg-surface-2 text-ink-faint",
                    item.id === "non_assegnate" && counts.non_assegnate > 0
                      ? "bg-danger/15 text-danger"
                      : "",
                  ].join(" ")}
                >
                  {counts[item.id]}
                </span>
              </button>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link
            href="/assistenza"
            className="flex items-center gap-2 rounded-lg border border-border bg-base/60 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-brand/40 hover:text-brand"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            Apri assistenza AI
          </Link>
        </div>
      </aside>

      {/* Lista conversazioni */}
      <div className="flex w-full min-w-0 flex-col border-r border-border lg:w-[380px] lg:shrink-0">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-ink">{filterLabel}</h3>
          <p className="text-xs text-ink-faint">
            {filtered.length} conversazion{filtered.length === 1 ? "e" : "i"}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-faint">
              Nessuna conversazione in questa vista.
            </div>
          ) : (
            filtered.map((c) => (
              <ConversationListRow
                key={c.id}
                conversation={c}
                active={c.id === selected?.id}
                onSelect={() => setSelectedId(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Pannello chat */}
      <div className="min-h-0 flex-1">
        {selected ? (
          <ConversationPanel
            conversation={selected}
            onTakeOver={() =>
              takeOverConversation(selected.id, CURRENT_OPERATOR.id)
            }
            onResolve={() => resolveConversation(selected.id)}
            onReply={(text) =>
              appendConversationMessage(selected.id, {
                role: "agent",
                content: text,
              })
            }
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-faint">
            Seleziona una conversazione per visualizzare i messaggi.
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationListRow({
  conversation,
  active,
  onSelect,
}: {
  conversation: ConversationRecord;
  active: boolean;
  onSelect: () => void;
}) {
  const initials = conversation.customerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={[
        "flex w-full gap-3 border-b border-border/60 px-4 py-3 text-left transition-colors",
        active ? "bg-brand-soft" : "hover:bg-surface/70",
      ].join(" ")}
    >
      <div className="relative shrink-0">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-xs font-bold text-ink-muted">
          {initials}
        </span>
        {conversation.visitorOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-base bg-ok" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
            {conversation.customerName}
          </span>
          <span className="shrink-0 text-[11px] text-ink-faint">
            {conversation.lastMessageLabel}
          </span>
        </div>
        <p className="text-[11px] text-brand">
          {CONVERSATION_CHANNEL_LABELS[conversation.channel]}
        </p>
        <p className="truncate text-xs text-ink-faint">
          {conversation.lastMessagePreview}
        </p>
        <div className="mt-1 flex items-center gap-1.5">
          {conversation.assignee === "ai" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 px-1.5 py-0.5 text-[10px] font-semibold text-ok">
              Operatore
            </span>
          )}
          {conversation.status === "risolto" && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-ok">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Risolta
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ConversationPanel({
  conversation,
  onTakeOver,
  onResolve,
  onReply,
}: {
  conversation: ConversationRecord;
  onTakeOver: () => void;
  onResolve: () => void;
  onReply: (text: string) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isOperator = conversation.assignee === "operatore";
  const isResolved = conversation.status === "risolto";
  const canReply = isOperator && !isResolved;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conversation.messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !canReply) return;
    onReply(text);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-border bg-surface/70 px-5 py-3 backdrop-blur-md">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-bold text-ink">
              {conversation.customerName}
            </h3>
            {conversation.visitorOnline ? (
              <span className="shrink-0 rounded-full bg-ok/15 px-2 py-0.5 text-[10px] font-semibold text-ok">
                Online
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-faint">
                Offline
              </span>
            )}
          </div>
          {conversation.customerEmail && (
            <p className="truncate text-xs text-ink-faint">
              {conversation.customerEmail}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <AssigneeBadge conversation={conversation} />

          {!isOperator && !isResolved && (
            <button
              onClick={onTakeOver}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
              Subentra
            </button>
          )}

          {!isResolved && (
            <button
              onClick={onResolve}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ok/40 bg-ok/10 px-3 py-1.5 text-xs font-semibold text-ok transition-colors hover:bg-ok/20"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 6 9 17l-5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Risolvi
            </button>
          )}
        </div>
      </div>

      {!conversation.visitorOnline && !isResolved && (
        <div className="border-b border-brand/20 bg-brand-soft/40 px-5 py-2 text-xs text-ink-muted">
          Il visitatore è offline: riceverà una notifica email per i messaggi non
          letti.
        </div>
      )}

      {/* Messaggi */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-grid px-5 py-4"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {conversation.messages.map((msg) => (
            <ConversationMessage key={msg.id} message={msg} />
          ))}
        </div>
      </div>

      {/* Input operatore */}
      <div className="border-t border-border bg-surface/90 px-5 py-4 backdrop-blur-md">
        <div className="mx-auto max-w-3xl">
          {!isResolved && !isOperator && (
            <p className="mb-3 text-center text-xs text-ink-faint">
              L&apos;assistente AI sta gestendo questa conversazione. Clicca{" "}
              <button
                onClick={onTakeOver}
                className="font-medium text-brand hover:underline"
              >
                Subentra
              </button>{" "}
              per rispondere personalmente.
            </p>
          )}

          {isResolved && (
            <p className="mb-3 text-center text-xs text-ink-faint">
              Conversazione risolta. Riapri dalla sezione &quot;Risolte&quot; per
              consultare la cronologia.
            </p>
          )}

          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!canReply}
              rows={2}
              placeholder={
                canReply
                  ? "Scrivi un messaggio al cliente…"
                  : isResolved
                    ? "Conversazione chiusa"
                    : "Subentra per rispondere…"
              }
              className="min-h-[48px] flex-1 resize-none rounded-xl border border-border bg-base px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!canReply || !input.trim()}
              className="inline-flex shrink-0 items-center justify-center self-end rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              Rispondi
            </button>
          </div>

          {canReply && (
            <p className="mt-2 text-center text-[11px] text-ink-faint">
              {CONVERSATION_CHANNEL_LABELS[conversation.channel]} · Rispondi come{" "}
              {CURRENT_OPERATOR.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AssigneeBadge({ conversation }: { conversation: ConversationRecord }) {
  if (conversation.assignee === "ai") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        Assistente AI
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-ok/30 bg-ok/10 px-2.5 py-1 text-xs font-medium text-ok">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
      </svg>
      {CURRENT_OPERATOR.name}
    </span>
  );
}

function ConversationMessage({ message }: { message: StoredConversationMessage }) {
  const isUser = message.role === "user";
  const isAgent = message.role === "agent";

  const senderLabel = isUser
    ? "Cliente"
    : isAgent
      ? CURRENT_OPERATOR.name
      : "Assistente AI";

  return (
    <div
      className={[
        "flex",
        isUser ? "justify-start" : "justify-end",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "rounded-bl-md border border-border bg-surface text-ink shadow-xl shadow-black/20"
            : isAgent
              ? "rounded-br-md bg-ok text-white shadow-lg shadow-ok/15"
              : "rounded-br-md border border-border bg-brand-soft text-ink",
        ].join(" ")}
      >
        <div className="mb-1 flex items-center gap-2">
          <span
            className={[
              "text-[11px] font-semibold uppercase tracking-wider",
              isUser
                ? "text-ink-faint"
                : isAgent
                  ? "text-white/80"
                  : "text-brand",
            ].join(" ")}
          >
            {senderLabel}
          </span>
          <span
            className={[
              "text-[10px]",
              isAgent ? "text-white/60" : "text-ink-faint",
            ].join(" ")}
          >
            {message.timestampLabel}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        {!isUser && message.spareParts && message.spareParts.length > 0 && (
          <SparePartCardList parts={message.spareParts} />
        )}
        {!isUser && message.ticket && <TicketBanner ticket={message.ticket} />}
      </div>
    </div>
  );
}
