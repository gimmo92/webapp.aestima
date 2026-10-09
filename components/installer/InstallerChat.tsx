"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useI18n, type TranslateFn } from "@/lib/i18n";

type ChatTurn = { role: "user" | "assistant"; content: string; source?: string | null };

export function InstallerChat() {
  const { t, locale } = useI18n();
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = draft.trim();
    if (!text || pending) return;
    const next: ChatTurn[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setDraft("");
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/installer-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          messages: next.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        message?: string;
        source?: string | null;
        code?: string;
      } | null;
      const reply = replyText(data, t);
      setMessages([...next, { role: "assistant", content: reply, source: data?.source }]);
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
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
            className={
              message.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={[
                "max-w-2xl whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm",
                message.role === "user"
                  ? "bg-brand text-white"
                  : "border border-border bg-surface text-ink",
              ].join(" ")}
            >
              {message.content}
              {message.role === "assistant" && message.source && (
                <p className="mt-2 text-[11px] text-ink-faint">
                  {t("installerChat.source", { name: message.source })}
                </p>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <p className="text-xs text-ink-faint">{t("installerChat.thinking")}</p>
        )}
      </div>
      <div className="border-t border-border bg-surface/40 px-5 py-3">
        {error && <p className="mb-2 text-xs text-danger">{error}</p>}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("installerChat.placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
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
  );
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
