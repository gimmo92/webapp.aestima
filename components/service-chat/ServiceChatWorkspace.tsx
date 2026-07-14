"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatAttachmentList } from "./ChatAttachmentList";
import { QuickReplyBubbles } from "./QuickReplyBubbles";
import { SparePartCardList } from "./SparePartCard";
import { TicketBanner } from "./TicketBanner";
import { KbMatchBanner } from "./KbMatchBanner";
import { KbSolutionFeedback } from "./KbSolutionFeedback";
import { EmbedCodeButtons } from "./EmbedCodeButtons";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  CHAT_ATTACHMENT_ACCEPT,
  fileToChatAttachment,
  MAX_ATTACHMENTS_PER_MESSAGE,
  revokeAttachmentUrls,
  toAttachmentPayload,
  type ChatAttachment,
} from "@/lib/serviceChatAttachments";
import {
  inferQuickReplies,
  inferTicketContextFromChat,
  WELCOME_QUICK_REPLIES,
} from "@/lib/serviceChatQuickReplies";
import type { DisplayMessage } from "@/lib/serviceChatTypes";
import { isReadyForKbSearch } from "@/lib/knowledgeSearch";

// =============================================================
// Chat assistenza service — UI principale
// Stato conversazione in React state (no localStorage).
// Quick-reply bubbles + allegati foto/documenti.
// =============================================================

const WELCOME: DisplayMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Buongiorno, sono l'assistente service di aestima. Posso aiutarti a identificare ricambi nella distinta della tua macchina o a trovare soluzioni a malfunzionamenti già risoliti in passato.\n\nScegli un'opzione qui sotto, allega foto o documenti, oppure scrivi liberamente.",
  quickReplies: WELCOME_QUICK_REPLIES,
};

let msgCounter = 0;
function nextId() {
  msgCounter += 1;
  return `msg-${Date.now()}-${msgCounter}`;
}

function stripQuickReplies(msgs: DisplayMessage[]): DisplayMessage[] {
  return msgs.map((m) =>
    m.quickReplies ? { ...m, quickReplies: undefined } : m
  );
}

function collectAttachmentUrls(msgs: DisplayMessage[]): ChatAttachment[] {
  const all: ChatAttachment[] = [];
  for (const m of msgs) {
    if (m.attachments) all.push(...m.attachments);
  }
  return all;
}

export function ServiceChatWorkspace({
  embed = false,
  hideReset = false,
  hideHeader = false,
  channel = embed ? "embed" : "assistenza",
  customerName = embed ? "Visitatore widget" : "Visitatore assistenza",
  customerEmail,
  initialConversationId,
}: {
  /** Layout compatto per iframe / widget embed. */
  embed?: boolean;
  /** Nasconde il pulsante reset (es. pannello bolla con chiusura esterna). */
  hideReset?: boolean;
  /** Nasconde l'header interno (iframe bolla con barra esterna). */
  hideHeader?: boolean;
  /** Canale di origine per l'inbox conversazioni. */
  channel?: "embed" | "assistenza" | "live_chat";
  /** Nome cliente mostrato nell'inbox operatore. */
  customerName?: string;
  customerEmail?: string;
  /** Riprende una conversazione esistente (es. embed con ?conv=). */
  initialConversationId?: string;
} = {}) {
  const showHeader = !hideHeader;
  const {
    createTicket,
    createConversation,
    appendConversationMessage,
    getConversationById,
    updateConversation,
    knowledgeBase,
    incrementKnowledgeFrequency,
  } = useInbox();
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>(
    []
  );
  const [attachError, setAttachError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kbSearching, setKbSearching] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const storedConversation = conversationId
    ? getConversationById(conversationId)
    : undefined;
  const operatorActive = storedConversation?.assignee === "operatore";
  const conversationResolved = storedConversation?.status === "risolto";

  const updateMessage = useCallback(
    (id: string, patch: Partial<DisplayMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const handleKbFeedback = useCallback(
    async (
      messageId: string,
      entryId: string,
      symptom: string,
      currentFrequency: number | undefined,
      helpful: boolean
    ) => {
      if (helpful) {
        updateMessage(messageId, { kbFeedback: "updating" });
        await new Promise((r) => setTimeout(r, 900));
        incrementKnowledgeFrequency(entryId);
        updateMessage(messageId, {
          kbFeedback: "helpful",
          kbMatch: {
            entryId,
            symptom,
            frequency: (currentFrequency ?? 0) + 1,
          },
        });
      } else {
        updateMessage(messageId, { kbFeedback: "not_helpful" });
      }
    },
    [updateMessage, incrementKnowledgeFrequency]
  );

  const ensureConversation = useCallback(() => {
    if (conversationId) return conversationId;
    const welcomeMsg = {
      id: "welcome",
      role: "assistant" as const,
      content: WELCOME.content,
      timestampLabel: new Date().toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    const id = createConversation({
      customerName,
      customerEmail,
      channel,
      initialMessages: [welcomeMsg],
    });
    setConversationId(id);
    return id;
  }, [
    conversationId,
    createConversation,
    customerName,
    customerEmail,
    channel,
  ]);

  const syncFromStored = useCallback(
    (conv: NonNullable<ReturnType<typeof getConversationById>>) => {
      const mapped: DisplayMessage[] = conv.messages.map((m) => ({
        id: m.id,
        role: m.role === "agent" ? "assistant" : m.role,
        content: m.content,
        spareParts: m.spareParts,
        ticket: m.ticket,
        isOperatorReply: m.role === "agent",
      }));
      setMessages(mapped.length > 0 ? mapped : [WELCOME]);
    },
    []
  );

  const syncedAgentCountRef = useRef(0);

  useEffect(() => {
    if (!initialConversationId) return;
    const conv = getConversationById(initialConversationId);
    if (conv) {
      syncFromStored(conv);
      syncedAgentCountRef.current = conv.messages.filter(
        (m) => m.role === "agent"
      ).length;
    }
    // Solo al mount con conversazione esistente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storedConversation) return;
    const agentMessages = storedConversation.messages.filter(
      (m) => m.role === "agent"
    );
    if (agentMessages.length <= syncedAgentCountRef.current) return;

    syncedAgentCountRef.current = agentMessages.length;
    setMessages((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const additions = agentMessages
        .filter((m) => !existingIds.has(m.id))
        .map((m) => ({
          id: m.id,
          role: "assistant" as const,
          content: m.content,
          isOperatorReply: true,
        }));
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  }, [storedConversation]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, pendingAttachments]);

  useEffect(() => {
    return () => {
      revokeAttachmentUrls(collectAttachmentUrls(messages));
      revokeAttachmentUrls(pendingAttachments);
    };
    // Cleanup solo allo smontaggio — i revoke su reset sono espliciti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removePendingAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setAttachError(null);
      const list = Array.from(files);
      if (list.length === 0) return;

      const slotsLeft = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length;
      if (slotsLeft <= 0) {
        setAttachError(`Massimo ${MAX_ATTACHMENTS_PER_MESSAGE} allegati per messaggio.`);
        return;
      }

      const toAdd = list.slice(0, slotsLeft);
      try {
        const converted: ChatAttachment[] = [];
        for (const file of toAdd) {
          converted.push(await fileToChatAttachment(file));
        }
        setPendingAttachments((prev) => [...prev, ...converted]);
      } catch (err) {
        setAttachError(
          err instanceof Error ? err.message : "Impossibile allegare il file."
        );
      } finally {
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [pendingAttachments.length]
  );

  const submitMessage = useCallback(
    async (text: string, attachments: ChatAttachment[] = []) => {
      const trimmed = text.trim();
      if ((!trimmed && attachments.length === 0) || loading) return;

      const content =
        trimmed ||
        (attachments.length === 1
          ? `Allegato: ${attachments[0].name}`
          : `Allegati inviati (${attachments.length} file)`);

      const userMsg: DisplayMessage = {
        id: nextId(),
        role: "user",
        content,
        attachments,
      };

      const cleared = stripQuickReplies(messages);
      const history = [...cleared, userMsg];
      setMessages(history);
      setInput("");
      setPendingAttachments([]);
      setAttachError(null);

      const convId = ensureConversation();
      appendConversationMessage(convId, {
        role: "user",
        content,
      });
      updateConversation(convId, { visitorOnline: true });

      const conv = getConversationById(convId);
      if (conv?.assignee === "operatore") {
        const waitMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content:
            "Il tuo messaggio è stato inoltrato all'operatore. Riceverai una risposta a breve.",
        };
        setMessages((prev) => [...prev, waitMsg]);
        return;
      }

      if (conv?.status === "risolto") {
        const closedMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content:
            "Questa conversazione è stata chiusa. Avvia una nuova conversazione per ulteriore assistenza.",
        };
        setMessages((prev) => [...prev, closedMsg]);
        return;
      }

      const apiMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map(toAttachmentPayload),
      }));

      setKbSearching(isReadyForKbSearch(apiMessages, content));
      setLoading(true);

      try {
        const res = await fetch("/api/service-chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, knowledgeBase }),
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

        const quickReplies =
          data.quickReplies ??
          inferQuickReplies(history, data.message, {
            hasTicket: Boolean(data.ticket),
            hasSpareParts: Boolean(data.spareParts?.length),
          });

        const assistantMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content: data.message,
          spareParts: data.spareParts,
          ticket: data.ticket,
          kbMatch: data.kbMatch,
          kbFeedback: data.kbMatch ? "pending" : undefined,
          quickReplies,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        appendConversationMessage(convId, {
          role: "assistant",
          content: data.message,
          spareParts: data.spareParts,
          ticket: data.ticket,
        });

        if (data.ticket) {
          const ctx = inferTicketContextFromChat(apiMessages);
          createTicket({
            id: data.ticket.id,
            summary: data.ticket.summary,
            description: ctx.description || data.ticket.summary,
            source: "chat_ai",
            category: ctx.category,
            machineModel: ctx.machineModel,
            machineSerial: ctx.machineSerial,
          });
        }
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
        setKbSearching(false);
        inputRef.current?.focus();
      }
    },
    [loading, messages, createTicket, ensureConversation, appendConversationMessage, getConversationById, updateConversation, knowledgeBase]
  );

  const submitText = useCallback(
    (text: string) => {
      void submitMessage(text, [...pendingAttachments]);
    },
    [submitMessage, pendingAttachments]
  );

  const sendMessage = useCallback(() => {
    submitText(input);
  }, [input, submitText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    revokeAttachmentUrls(collectAttachmentUrls(messages));
    revokeAttachmentUrls(pendingAttachments);
    setMessages([WELCOME]);
    setConversationId(null);
    setInput("");
    setPendingAttachments([]);
    setAttachError(null);
    inputRef.current?.focus();
  };

  const canSend =
    !loading &&
    !conversationResolved &&
    (input.trim().length > 0 || pendingAttachments.length > 0);

  const lastAssistantIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  })();
  const activeQuickReplies =
    !loading && lastAssistantIdx >= 0
      ? messages[lastAssistantIdx].quickReplies
      : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showHeader && (
      <div
        className={[
          "border-b border-border bg-surface/70 backdrop-blur-md",
          embed ? "px-4 py-3" : "px-6 py-5",
        ].join(" ")}
      >
        <div
          className={[
            "flex items-start justify-between gap-4",
            embed ? "w-full" : "mx-auto max-w-4xl",
          ].join(" ")}
        >
          <div>
            <div className="mb-0.5 flex items-center gap-2">
              <span
                className={[
                  "flex items-center justify-center rounded-lg bg-brand-soft",
                  embed ? "h-7 w-7" : "h-8 w-8",
                ].join(" ")}
              >
                <svg
                  width={embed ? 16 : 18}
                  height={embed ? 16 : 18}
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
              <h1
                className={[
                  "font-bold text-ink",
                  embed ? "text-base" : "text-xl sm:text-2xl",
                ].join(" ")}
              >
                Assistenza service
              </h1>
            </div>
            {!embed && (
              <p className="text-sm text-ink-muted">
                Ricambi, troubleshooting, allegati e ticket — guidato da Claude
              </p>
            )}
          </div>
          {!hideReset && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {!embed && <EmbedCodeButtons />}
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
          )}
        </div>
      </div>
      )}

      <div
        ref={scrollRef}
        className={[
          "min-h-0 flex-1 overflow-y-auto bg-grid py-4 sm:py-6",
          embed ? "px-3 sm:px-4" : "px-4 py-6 sm:px-6",
        ].join(" ")}
      >
        <div className={embed ? "space-y-4" : "mx-auto max-w-4xl space-y-5"}>
          {messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              quickReplies={
                idx === lastAssistantIdx ? activeQuickReplies : undefined
              }
              onQuickReply={(value) => void submitText(value)}
              quickRepliesDisabled={loading}
              onKbFeedback={(helpful) =>
                msg.kbMatch &&
                void handleKbFeedback(
                  msg.id,
                  msg.kbMatch.entryId,
                  msg.kbMatch.symptom,
                  msg.kbMatch.frequency,
                  helpful
                )
              }
            />
          ))}
          {loading && <TypingIndicator kbSearch={kbSearching} />}
        </div>
      </div>

      <div
        className={[
          "border-t border-border bg-surface/90 backdrop-blur-md",
          embed ? "px-3 py-3" : "px-4 py-4 sm:px-6",
        ].join(" ")}
      >
        <div className={embed ? "w-full" : "mx-auto max-w-4xl"}>
          <input
            ref={fileRef}
            type="file"
            accept={CHAT_ATTACHMENT_ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) void handleFiles(files);
            }}
          />

          {pendingAttachments.length > 0 && (
            <div className="mb-3 rounded-xl border border-border bg-base/60 p-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                Allegati pronti per l&apos;invio
              </p>
              <ChatAttachmentList
                attachments={pendingAttachments}
                onRemove={removePendingAttachment}
                variant="pending"
              />
            </div>
          )}

          {attachError && (
            <p className="mb-2 text-xs text-danger">{attachError}</p>
          )}

          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
              className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center self-end rounded-xl border border-border bg-base text-ink-muted transition-colors hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
              title="Allega foto o documento"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="m21.44 11.05-8.49 8.49a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 1 1 4.24 4.24l-9.19 9.19a1.5 1.5 0 0 1-2.12-2.12l8.49-8.48"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={2}
              placeholder="Descrivi il problema o allega una foto della macchina / del componente…"
              className="min-h-[52px] flex-1 resize-none rounded-xl border border-border bg-base px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
            />
            <button
              onClick={sendMessage}
              disabled={!canSend}
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
          {operatorActive && !conversationResolved && (
            <p className="mt-2 text-center text-xs text-ok">
              Un operatore sta gestendo questa conversazione.
            </p>
          )}
          <p className="mt-3 text-center text-xs text-ink-faint">
            Foto (JPG, PNG) analizzate dall&apos;AI · Documenti PDF/Office
            inoltrati al tecnico · Max {MAX_ATTACHMENTS_PER_MESSAGE} allegati
          </p>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  quickReplies,
  onQuickReply,
  quickRepliesDisabled,
  onKbFeedback,
}: {
  message: DisplayMessage;
  quickReplies?: DisplayMessage["quickReplies"];
  onQuickReply: (value: string) => void;
  quickRepliesDisabled?: boolean;
  onKbFeedback?: (helpful: boolean) => void;
}) {
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
            {message.content.includes("operatore sta gestendo") ||
            message.content.includes("inoltrato all'operatore") ||
            message.content.includes("conversazione è stata chiusa")
              ? "Sistema"
              : message.isOperatorReply
                ? "Operatore"
                : "Assistente aestima"}
          </p>
        )}
        {message.content && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
            {message.content}
          </p>
        )}
        {message.attachments && message.attachments.length > 0 && (
          <ChatAttachmentList
            attachments={message.attachments}
            isUserMessage={isUser}
          />
        )}
        {!isUser && message.spareParts && message.spareParts.length > 0 && (
          <SparePartCardList parts={message.spareParts} />
        )}
        {!isUser && message.ticket && (
          <TicketBanner ticket={message.ticket} />
        )}
        {!isUser && message.kbMatch && (
          <KbMatchBanner match={message.kbMatch} />
        )}
        {!isUser &&
          message.kbMatch &&
          message.kbFeedback &&
          onKbFeedback && (
            <KbSolutionFeedback
              status={message.kbFeedback}
              entryId={message.kbMatch.entryId}
              onHelpful={() => onKbFeedback(true)}
              onNotHelpful={() => onKbFeedback(false)}
              disabled={message.kbFeedback !== "pending"}
            />
          )}
        {!isUser && quickReplies && quickReplies.length > 0 && (
          <QuickReplyBubbles
            options={quickReplies}
            onSelect={onQuickReply}
            disabled={quickRepliesDisabled}
          />
        )}
      </div>
    </div>
  );
}

function TypingIndicator({ kbSearch = false }: { kbSearch?: boolean }) {
  return (
    <div className="flex justify-start animate-fade-up">
      <div
        className={[
          "rounded-2xl rounded-bl-md border px-5 py-4 shadow-xl shadow-black/20",
          kbSearch
            ? "border-brand/30 bg-brand-soft/40"
            : "border-border bg-surface",
        ].join(" ")}
      >
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
          <span className="ml-2 text-sm text-ink-muted">
            {kbSearch
              ? "Attendi, cerco nella knowledge base…"
              : "Sta scrivendo…"}
          </span>
        </div>
      </div>
    </div>
  );
}
