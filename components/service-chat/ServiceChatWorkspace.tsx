"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SparePartCardList } from "./SparePartCard";
import { TicketBanner } from "./TicketBanner";
import type { DisplayMessage } from "@/lib/serviceChatTypes";

// =============================================================
// Chat assistenza service — UI principale
// Stato conversazione in React state (no localStorage).
// Ottimizzata per desktop / proiettore in presentazione.
// =============================================================

const WELCOME: DisplayMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Buongiorno, sono l'assistente service di aestima. Posso aiutarti a identificare ricambi nella distinta della tua macchina o a trovare soluzioni a malfunzionamenti già risolti in passato.\n\nPer iniziare, indicami il modello o la matricola della macchina e descrivi cosa ti serve.",
};

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

export function ServiceChatWorkspace() {
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll automatico verso l'ultimo messaggio.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: DisplayMessage = {
      id: nextId(),
      role: "user",
      content: text,
    };

    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    // Cronologia per l'API (solo role + content, senza welcome id).
    const apiMessages = history.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/service-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content:
            data?.error ??
            "Al momento non riesco a rispondere. Riprova tra qualche istante.",
          isError: true,
        };
        setMessages((prev) => [...prev, errMsg]);
        return;
      }

      const assistantMsg: DisplayMessage = {
        id: nextId(),
        role: "assistant",
        content: data.message,
        spareParts: data.spareParts,
        ticket: data.ticket,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg: DisplayMessage = {
        id: nextId(),
        role: "assistant",
        content:
          "Connessione non disponibile. Verifica la rete e riprova.",
        isError: true,
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([WELCOME]);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header sezione */}
      <div className="border-b border-border bg-surface/70 px-6 py-5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="text-brand"
                >
                  <path
                    d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <h1 className="text-xl font-bold text-ink sm:text-2xl">
                Assistenza service AI
              </h1>
            </div>
            <p className="text-sm text-ink-muted">
              Ricambi, troubleshooting e apertura ticket — guidato da Claude
            </p>
          </div>
          <button
            onClick={resetChat}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Nuova conversazione
          </button>
        </div>
      </div>

      {/* Area messaggi */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto bg-grid px-4 py-6 sm:px-6"
      >
        <div className="mx-auto max-w-4xl space-y-5">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
          {loading && <TypingIndicator />}
        </div>
      </div>

      {/* Input + footer disclaimer */}
      <div className="border-t border-border bg-surface/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={2}
              placeholder="Descrivi la macchina e il problema, oppure chiedi un ricambio…"
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-border bg-base px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="m4 12 15-8-6 16-3-6-6-2Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              Invia
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-ink-faint">
            Le risposte dell&apos;agente AI vanno validate da un tecnico
            qualificato prima di procedere con ordini o interventi.
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={[
        "animate-fade-up flex",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      <div
        className={[
          "max-w-[85%] rounded-2xl px-5 py-3.5 sm:max-w-[75%]",
          isUser
            ? "rounded-br-md bg-brand text-white shadow-lg shadow-brand/15"
            : message.isError
              ? "rounded-bl-md border border-danger/40 bg-danger/10 text-ink"
              : "rounded-bl-md border border-border bg-surface text-ink shadow-xl shadow-black/20",
        ].join(" ")}
      >
        {!isUser && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
            Assistente aestima
          </p>
        )}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {message.content}
        </p>
        {!isUser && message.spareParts && message.spareParts.length > 0 && (
          <SparePartCardList parts={message.spareParts} />
        )}
        {!isUser && message.ticket && (
          <TicketBanner ticket={message.ticket} />
        )}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start animate-fade-up">
      <div className="rounded-2xl rounded-bl-md border border-border bg-surface px-5 py-4 shadow-xl shadow-black/20">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-brand">
          Assistente aestima
        </p>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-brand/60"
              style={{
                animation: "pulse-ring 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
          <span className="ml-2 text-sm text-ink-muted">Sta scrivendo…</span>
        </div>
      </div>
    </div>
  );
}
