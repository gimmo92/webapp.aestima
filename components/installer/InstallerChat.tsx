"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChatAttachmentList } from "@/components/service-chat/ChatAttachmentList";
import { useI18n, type TranslateFn } from "@/lib/i18n";
import {
  fileToChatAttachment,
  type ChatAttachment,
} from "@/lib/serviceChatAttachments";

type ManualSourceRef = { name: string; excerpt: string; page?: number | null };

type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  sources?: ManualSourceRef[];
  images?: ChatAttachment[];
};

type Thread = {
  id: string;
  updatedAt: number;
  messages: ChatTurn[];
};

const STORAGE_KEY = "aftercore:installer-chats";
const NO_MESSAGES: ChatTurn[] = [];

export function InstallerChat() {
  const { t, locale } = useI18n();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<ChatAttachment[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const ready = useRef(false);

  useEffect(() => {
    setThreads(readThreads());
    ready.current = true;
  }, []);

  useEffect(() => {
    if (!ready.current) return;
    writeThreads(threads);
  }, [threads]);

  const active = threads.find((thread) => thread.id === activeId) ?? null;
  const messages = active?.messages ?? NO_MESSAGES;

  const sources = useMemo(() => {
    if (focusIndex != null && messages[focusIndex]?.sources) {
      return messages[focusIndex].sources ?? [];
    }
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].sources && messages[i].sources!.length > 0) {
        return messages[i].sources ?? [];
      }
    }
    return [];
  }, [messages, focusIndex]);

  const updateActive = (nextMessages: ChatTurn[], id = activeId) => {
    const threadId = id ?? `chat-${Date.now().toString(36)}`;
    setActiveId(threadId);
    setThreads((prev) => {
      const rest = prev.filter((thread) => thread.id !== threadId);
      return [
        { id: threadId, updatedAt: Date.now(), messages: nextMessages },
        ...rest,
      ].slice(0, 40);
    });
    return threadId;
  };

  const send = async () => {
    const text = draft.trim();
    if ((!text && pendingFiles.length === 0) || pending) return;
    const userTurn: ChatTurn = {
      role: "user",
      content: text,
      images: pendingFiles,
    };
    const next = [...messages, userTurn];
    const threadId = updateActive(next);
    setDraft("");
    setPendingFiles([]);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/installer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: next.map((message, index) => ({
            role: message.role,
            content:
              message.content ||
              (message.images?.length ? t("installerChat.photo") : ""),
            images:
              index === next.length - 1
                ? message.images
                    ?.filter((image) => image.dataBase64)
                    .map((image) => ({
                      mimeType: image.mimeType,
                      dataBase64: image.dataBase64,
                    }))
                : undefined,
          })),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        sources?: ManualSourceRef[];
        code?: string;
      } | null;
      const reply = replyText(data, t);
      const withReply: ChatTurn[] = [
        ...next,
        {
          role: "assistant",
          content: reply,
          sources: data?.sources ?? [],
        },
      ];
      updateActive(withReply, threadId);
      setFocusIndex(withReply.length - 1);
      if (!res.ok && !data?.code && !data?.message) setError(t("installerChat.error"));
    } catch {
      setError(t("installerChat.error"));
    } finally {
      setPending(false);
      requestAnimationFrame(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
      });
    }
  };

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    const next = [...pendingFiles];
    for (const file of Array.from(list)) {
      if (next.length >= 4) break;
      if (!file.type.startsWith("image/")) {
        setError(t("installerChat.imagesOnly"));
        continue;
      }
      try {
        next.push(await fileToChatAttachment(file));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("installerChat.error"));
      }
    }
    setPendingFiles(next);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface">
        <div className="border-b border-border px-3 py-3">
          <p className="px-1 text-sm font-bold text-ink">{t("installerChat.history")}</p>
          <button
            type="button"
            onClick={() => {
              setActiveId(null);
              setFocusIndex(null);
              setDraft("");
              setError(null);
            }}
            className="mt-3 w-full rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {t("installerChat.newChat")}
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
          {threads.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-ink-faint">
              {t("installerChat.historyEmpty")}
            </li>
          )}
          {threads.map((thread) => {
            const title = threadTitle(thread, t("installerChat.newChat"));
            const selected = thread.id === activeId;
            return (
              <li key={thread.id} className="group flex items-start gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(thread.id);
                    setFocusIndex(null);
                  }}
                  className={[
                    "min-w-0 flex-1 rounded-xl px-3 py-2 text-left",
                    selected ? "bg-brand-soft" : "hover:bg-surface-2/80",
                  ].join(" ")}
                >
                  <span className="block truncate text-sm font-medium text-ink">
                    {title}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setThreads((prev) => prev.filter((item) => item.id !== thread.id));
                    if (activeId === thread.id) setActiveId(null);
                  }}
                  className="shrink-0 px-1 py-2 text-[11px] text-ink-faint opacity-0 hover:text-danger group-hover:opacity-100"
                >
                  {t("installerChat.deleteChat")}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-border bg-surface/40 px-5 py-3">
          <h1 className="text-sm font-semibold text-ink">{t("installerChat.title")}</h1>
          <p className="text-xs text-ink-faint">{t("installerChat.hint")}</p>
        </div>
        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 && (
            <p className="text-sm text-ink-muted">{t("installerChat.empty")}</p>
          )}
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              <button
                type="button"
                onClick={() => {
                  if (message.role === "assistant") setFocusIndex(index);
                }}
                className={[
                  "max-w-2xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm",
                  message.role === "user"
                    ? "bg-brand text-white"
                    : "border border-border bg-surface text-ink",
                  focusIndex === index ? "ring-2 ring-brand/40" : "",
                ].join(" ")}
              >
                {message.images && message.images.length > 0 && (
                  <ChatAttachmentList
                    attachments={message.images}
                    variant="message"
                    isUserMessage={message.role === "user"}
                  />
                )}
                {message.content || (message.images?.length ? t("installerChat.photo") : "")}
              </button>
            </div>
          ))}
          {pending && <p className="text-xs text-ink-faint">{t("installerChat.thinking")}</p>}
        </div>
        <div className="border-t border-border bg-surface/40 px-5 py-3">
          {error && <p className="mb-2 text-xs text-danger">{error}</p>}
          {pendingFiles.length > 0 && (
            <div className="mb-2">
              <ChatAttachmentList
                attachments={pendingFiles}
                variant="pending"
                onRemove={(id) =>
                  setPendingFiles((prev) => prev.filter((file) => file.id !== id))
                }
              />
            </div>
          )}
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(event) => void onFiles(event.target.files)}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              title={t("installerChat.attach")}
              className="rounded-xl border border-border bg-base px-3 text-sm font-semibold text-ink hover:border-brand"
            >
              {t("installerChat.attach")}
            </button>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("installerChat.placeholder")}
              className="min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={pending || (!draft.trim() && pendingFiles.length === 0)}
              className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong disabled:opacity-50"
            >
              {t("installerChat.send")}
            </button>
          </form>
          <Link
            href="/manuale"
            className="mt-2 inline-block text-xs font-medium text-brand hover:underline"
          >
            {t("installerChat.openManuals")}
          </Link>
        </div>
      </div>

      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-bold text-ink">{t("installerChat.sources")}</p>
          <p className="mt-0.5 text-[11px] text-ink-faint">{t("installerChat.sourcesHint")}</p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {sources.length === 0 ? (
            <p className="px-1 py-6 text-xs leading-relaxed text-ink-faint">
              {t("installerChat.sourcesEmpty")}
            </p>
          ) : (
            sources.map((source, index) => (
              <article
                key={`${source.name}-${index}`}
                className="rounded-xl border border-border bg-base px-3 py-2.5"
              >
                <p className="truncate text-xs font-semibold text-brand">
                  {source.name}
                  {source.page != null && (
                    <span className="font-normal text-ink-faint">
                      {" · "}
                      {t("installerChat.page", { page: String(source.page) })}
                    </span>
                  )}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink-muted">
                  {source.excerpt}
                </p>
              </article>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

function threadTitle(thread: Thread, fallback: string): string {
  const first = thread.messages.find((message) => message.role === "user");
  const raw = first?.content.trim() || first?.images?.[0]?.name || "";
  if (!raw) return fallback;
  return raw.length > 42 ? `${raw.slice(0, 40).trim()}…` : raw;
}

function replyText(
  data: { message?: string; code?: string } | null,
  t: TranslateFn
): string {
  if (data?.message) return data.message;
  if (data?.code === "noManuals") return t("installerChat.noManuals");
  if (data?.code === "noText") return t("installerChat.noText");
  if (data?.code === "unavailable") return t("installerChat.unavailable");
  return t("installerChat.error");
}

function readThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((thread) => thread && typeof thread.id === "string");
  } catch {
    return [];
  }
}

function writeThreads(threads: Thread[]) {
  const slim = threads.map((thread) => ({
    ...thread,
    messages: thread.messages.map((message) => ({
      role: message.role,
      content: message.content,
      sources: message.sources,
      images: message.images?.map((image) => ({
        id: image.id,
        name: image.name,
        mimeType: image.mimeType,
        size: image.size,
        kind: image.kind,
      })),
    })),
  }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Lo storico resta in memoria se il browser rifiuta la scrittura.
  }
}
