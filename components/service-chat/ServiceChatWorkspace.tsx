"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChatAttachmentList } from "./ChatAttachmentList";
import { ChatHistorySidebar } from "./ChatHistorySidebar";
import { ChatResultsSidebar, collectChatResults } from "./ChatResultsSidebar";
import { QuickReplyBubbles } from "./QuickReplyBubbles";
import { EmbedCodeButtons } from "./EmbedCodeButtons";
import { newMessageId } from "@/lib/conversationData";
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
  ensureMachineOtherOption,
} from "@/lib/serviceChatQuickReplies";
import type { DisplayMessage } from "@/lib/serviceChatTypes";
import { useI18n, translate, type TranslateFn } from "@/lib/i18n";
import { DEFAULT_LOCALE } from "@/lib/i18n/locale";
import { isReadyForKbSearch } from "@/lib/knowledgeSearch";
import { useSpeechDictation } from "@/lib/useSpeechDictation";
import {
  buildTicketDescription,
  buildTicketSummary,
  extractMachineFromMessages,
  inferTicketCategory,
  inferTicketPriority,
  isAiUnresolved,
  isHumanEscalationIntent,
  withHumanEscalationBubble,
} from "@/lib/ticketEscalate";

// =============================================================
// Chat assistenza service — UI principale
// Stato conversazione in React state (no localStorage).
// Quick-reply bubbles + allegati foto/documenti.
// =============================================================

function buildWelcome(t: TranslateFn): DisplayMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: t("chat.welcome"),
    quickReplies: [
      { label: t("chat.qrSpare"), value: t("chat.qrSpare") },
      { label: t("chat.qrMalfunction"), value: t("chat.qrMalfunction") },
      { label: t("chat.qrMissingCode"), value: t("chat.qrMissingCode") },
      { label: t("chat.qrOther"), value: t("chat.qrOtherValue") },
    ],
  };
}

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
    conversations,
    createConversation,
    appendConversationMessage,
    getConversationById,
    updateConversation,
    deleteConversation,
    conversationsReady,
    knowledgeBase,
    incrementKnowledgeFrequency,
    createTicket,
  } = useInbox();
  const { t, locale, dateLocale } = useI18n();
  const welcome = useMemo(() => buildWelcome(t), [t]);
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  );
  const chatSessionKey = `aftercore:chat:${channel}`;
  const skipRestoreRef = useRef(false);
  const restoredRef = useRef(Boolean(initialConversationId));
  const [messages, setMessages] = useState<DisplayMessage[]>(() => [
    buildWelcome((key) => translate(DEFAULT_LOCALE, key)),
  ]);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>(
    []
  );
  const [parkMachines, setParkMachines] = useState<
    { model: string; serial: string }[]
  >([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [kbSearching, setKbSearching] = useState(false);
  const [overlayResultsOpen, setOverlayResultsOpen] = useState(false);
  const hadResultsRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const storedConversation = conversationId
    ? getConversationById(conversationId)
    : undefined;
  const operatorActive = storedConversation?.assignee === "operatore";
  const conversationResolved = storedConversation?.status === "risolto";

  const {
    supported: dictationSupported,
    listening: dictating,
    error: dictationError,
    toggle: toggleDictation,
    stop: stopDictation,
    clearError: clearDictationError,
  } = useSpeechDictation({
    onTranscript: setInput,
    enabled: !loading && !conversationResolved,
  });

  const updateMessage = useCallback(
    (id: string, patch: Partial<DisplayMessage>) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
      );
    },
    []
  );

  const ensureConversation = useCallback(() => {
    if (conversationId) return conversationId;
    const welcomeMsg = {
      id: newMessageId(),
      role: "assistant" as const,
      content: welcome.content,
      timestampLabel: new Date().toLocaleTimeString(dateLocale, {
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
    welcome,
    dateLocale,
  ]);

  /** Crea un ServiceTicket collegato alla conversazione (una sola volta). */
  const escalateToTicket = useCallback(
    (reason: string, history: DisplayMessage[]) => {
      const convId = ensureConversation();
      const conv = getConversationById(convId);
      if (conv?.ticketId) {
        return { ticketId: conv.ticketId, created: false as const };
      }

      const machineFromChat = extractMachineFromMessages(history);
      const machineModel = conv?.machineModel ?? machineFromChat.machineModel;
      const machineSerial = conv?.machineSerial ?? machineFromChat.machineSerial;

      if (
        (machineModel && machineModel !== conv?.machineModel) ||
        (machineSerial && machineSerial !== conv?.machineSerial)
      ) {
        updateConversation(convId, {
          machineModel: machineModel ?? conv?.machineModel,
          machineSerial: machineSerial ?? conv?.machineSerial,
        });
      }

      const summary = buildTicketSummary(history, {
        customerName: conv?.customerName ?? customerName,
        machineModel,
        machineSerial,
      });
      const ticketId = createTicket({
        source: "chat_ai",
        category: inferTicketCategory(history),
        priority: inferTicketPriority(history),
        summary,
        description: buildTicketDescription(history, reason),
        machineModel,
        machineSerial,
      });

      updateConversation(convId, { ticketId });

      const ticket = { id: ticketId, summary };
      const notice: DisplayMessage = {
        id: nextId(),
        role: "assistant",
        content: t("chat.ticketOpened"),
        ticket,
      };
      setMessages((prev) => [...prev, notice]);
      appendConversationMessage(convId, {
        role: "assistant",
        content: notice.content,
        ticket,
      });

      return { ticketId, created: true as const };
    },
    [
      ensureConversation,
      getConversationById,
      updateConversation,
      createTicket,
      appendConversationMessage,
      customerName,
    ]
  );

  const hasActiveConversation = useMemo(
    () =>
      Boolean(conversationId) && messages.some((m) => m.role === "user"),
    [conversationId, messages]
  );

  const existingTicketId = storedConversation?.ticketId ?? null;

  const handleCreateTicket = useCallback(() => {
    if (!hasActiveConversation || existingTicketId || conversationResolved) {
      return;
    }
    escalateToTicket("Ticket creato manualmente da Assistenza AI", messages);
  }, [
    hasActiveConversation,
    existingTicketId,
    conversationResolved,
    escalateToTicket,
    messages,
  ]);

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
        setMessages((prev) => {
          escalateToTicket(
            "Soluzione knowledge base non utile per il cliente",
            prev
          );
          return prev;
        });
      }
    },
    [updateMessage, incrementKnowledgeFrequency, escalateToTicket]
  );

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
      setMessages(mapped.length > 0 ? mapped : [welcome]);
    },
    [welcome]
  );

  const syncedAgentCountRef = useRef(0);

  useEffect(() => {
    if (conversationId) return;
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === "welcome" ? [welcome] : prev
    );
  }, [welcome, conversationId]);

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
        setAttachError(t("chat.maxAttachments", { n: MAX_ATTACHMENTS_PER_MESSAGE }));
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
          err instanceof Error ? err.message : t("chat.attachFail")
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
            t("chat.forwardedToOperator"),
        };
        setMessages((prev) => [...prev, waitMsg]);
        return;
      }

      if (conv?.status === "risolto") {
        const closedMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content:
            t("chat.conversationClosed"),
        };
        setMessages((prev) => [...prev, closedMsg]);
        return;
      }

      // Richiesta esplicita di tecnico → apre ticket e non chiama l'AI
      if (isHumanEscalationIntent(content)) {
        escalateToTicket("Richiesta esplicita del cliente", history);
        setLoading(false);
        setKbSearching(false);
        return;
      }

      const apiMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map(toAttachmentPayload),
      }));

      setKbSearching(isReadyForKbSearch(apiMessages, content, parkMachines));
      setLoading(true);

      try {
        const res = await fetch("/api/service-chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messages: apiMessages, knowledgeBase, locale }),
        });

        const data = await res.json();

        if (!res.ok) {
          const errMsg: DisplayMessage = {
            id: nextId(),
            role: "assistant",
            content:
              data?.error ?? t("chat.errorRetry"),
            isError: true,
          };
          setMessages((prev) => [...prev, errMsg]);
          appendConversationMessage(convId, {
            role: "assistant",
            content: errMsg.content,
          });
          return;
        }

        const userTurns = history.filter((m) => m.role === "user").length;
        if (Array.isArray(data.machines)) {
          setParkMachines(data.machines);
        }
        const machinesForReplies = Array.isArray(data.machines)
          ? data.machines
          : parkMachines;
        const quickReplies = withHumanEscalationBubble(
          ensureMachineOtherOption(
            data.quickReplies ??
              inferQuickReplies(history, data.message, {
                hasSpareParts: Boolean(data.spareParts?.length),
                machines: machinesForReplies,
              }),
            machinesForReplies
          ),
          userTurns,
          {
            force: isAiUnresolved(data.message),
            hasTicket: Boolean(getConversationById(convId)?.ticketId),
          }
        );

        const machineHint = extractMachineFromMessages(history);
        if (machineHint.machineModel || machineHint.machineSerial) {
          updateConversation(convId, {
            machineModel:
              machineHint.machineModel ?? getConversationById(convId)?.machineModel,
            machineSerial:
              machineHint.machineSerial ?? getConversationById(convId)?.machineSerial,
          });
        }

        const assistantMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content: data.message,
          spareParts: data.spareParts,
          kbMatch: data.kbMatch,
          kbFeedback: data.kbMatch ? "pending" : undefined,
          quickReplies,
        };
        setMessages((prev) => [...prev, assistantMsg]);

        appendConversationMessage(convId, {
          role: "assistant",
          content: data.message,
          spareParts: data.spareParts,
        });
      } catch {
        const errMsg: DisplayMessage = {
          id: nextId(),
          role: "assistant",
          content:
            t("chat.errorNetwork"),
          isError: true,
        };
        setMessages((prev) => [...prev, errMsg]);
        appendConversationMessage(convId, {
          role: "assistant",
          content: errMsg.content,
        });
      } finally {
        setLoading(false);
        setKbSearching(false);
        inputRef.current?.focus();
      }
    },
    [
      loading,
      messages,
      ensureConversation,
      appendConversationMessage,
      getConversationById,
      updateConversation,
      knowledgeBase,
      escalateToTicket,
      parkMachines,
      locale,
      t,
    ]
  );

  const submitText = useCallback(
    (text: string) => {
      stopDictation();
      void submitMessage(text, [...pendingAttachments]);
    },
    [submitMessage, pendingAttachments, stopDictation]
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
    skipRestoreRef.current = true;
    try {
      sessionStorage.removeItem(chatSessionKey);
    } catch {
      /* ignore */
    }
    stopDictation();
    clearDictationError();
    revokeAttachmentUrls(collectAttachmentUrls(messages));
    revokeAttachmentUrls(pendingAttachments);
    setMessages([welcome]);
    setConversationId(null);
    setInput("");
    setPendingAttachments([]);
    setAttachError(null);
    setOverlayResultsOpen(false);
    hadResultsRef.current = false;
    syncedAgentCountRef.current = 0;
    inputRef.current?.focus();
  };

  const historyConversations = useMemo(
    () => conversations.filter((c) => c.channel === channel),
    [conversations, channel]
  );

  const openConversation = useCallback(
    (id: string) => {
      if (id === conversationId || loading) return;
      const conv = getConversationById(id);
      if (!conv) return;
      stopDictation();
      clearDictationError();
      revokeAttachmentUrls(collectAttachmentUrls(messages));
      revokeAttachmentUrls(pendingAttachments);
      setPendingAttachments([]);
      setAttachError(null);
      setInput("");
      setOverlayResultsOpen(false);
      hadResultsRef.current = false;
      setConversationId(id);
      syncFromStored(conv);
      syncedAgentCountRef.current = conv.messages.filter(
        (m) => m.role === "agent"
      ).length;
      inputRef.current?.focus();
    },
    [
      conversationId,
      loading,
      getConversationById,
      stopDictation,
      clearDictationError,
      messages,
      pendingAttachments,
      syncFromStored,
    ]
  );

  useEffect(() => {
    if (conversationId) {
      try {
        sessionStorage.setItem(chatSessionKey, conversationId);
      } catch {
        /* ignore */
      }
    }
  }, [conversationId, chatSessionKey]);

  useEffect(() => {
    if (!conversationsReady || skipRestoreRef.current || restoredRef.current) {
      return;
    }
    if (conversationId) {
      restoredRef.current = true;
      return;
    }
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(chatSessionKey);
    } catch {
      saved = null;
    }
    const fromSession = saved ? getConversationById(saved) : undefined;
    const latest = historyConversations[0];
    const conv = fromSession ?? latest;
    if (!conv) {
      restoredRef.current = true;
      return;
    }
    restoredRef.current = true;
    openConversation(conv.id);
  }, [
    conversationsReady,
    conversationId,
    chatSessionKey,
    getConversationById,
    historyConversations,
    openConversation,
  ]);

  const handleDeleteConversation = (id: string) => {
    if (
      !window.confirm(
        t("chat.deleteConfirm")
      )
    ) {
      return;
    }
    deleteConversation(id);
    if (conversationId === id) resetChat();
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

  const chatResults = collectChatResults(messages);

  useEffect(() => {
    if (!embed) return;
    const show = chatResults.hasResults || kbSearching;
    if (show && !hadResultsRef.current) {
      setOverlayResultsOpen(true);
    }
    hadResultsRef.current = show;
  }, [embed, chatResults.hasResults, kbSearching]);

  const handleSidebarKbFeedback = useCallback(
    (helpful: boolean) => {
      const current = collectChatResults(messages);
      if (!current.kbMessageId || !current.kbMatch) return;
      void handleKbFeedback(
        current.kbMessageId,
        current.kbMatch.entryId,
        current.kbMatch.symptom,
        current.kbMatch.frequency,
        helpful
      );
    },
    [messages, handleKbFeedback]
  );

  const handleRemoveSparePart = useCallback((code: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.spareParts?.length) return m;
        const spareParts = m.spareParts.filter((p) => p.code !== code);
        return {
          ...m,
          spareParts: spareParts.length > 0 ? spareParts : undefined,
        };
      })
    );
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1">
      {!embed && (
        <ChatHistorySidebar
          conversations={historyConversations}
          activeId={conversationId}
          onSelect={openConversation}
          onDelete={handleDeleteConversation}
          onNew={resetChat}
          disabled={loading}
        />
      )}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {showHeader && (
      <div
        className={[
          "border-b border-border bg-surface/70 backdrop-blur-md",
          embed ? "px-4 py-3" : "px-6 py-5",
        ].join(" ")}
      >
        <div className="flex w-full items-start justify-between gap-4">
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
                {t("chat.title")}
              </h1>
            </div>
          </div>
          {!hideReset && (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {!embed && <EmbedCodeButtons />}
              {existingTicketId ? (
                <Link
                  href={`/ticket/lista?id=${encodeURIComponent(existingTicketId)}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-semibold text-brand transition-colors hover:bg-brand/20"
                >
                  <svg
                    width="14"
                    height="14"
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
                  {t("chat.viewTicket")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateTicket}
                  disabled={
                    !hasActiveConversation || loading || conversationResolved
                  }
                  title={
                    hasActiveConversation
                      ? t("chat.ticketHint")
                      : t("chat.ticketHintWait")
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-brand/40 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:text-ink-muted"
                >
                  <svg
                    width="14"
                    height="14"
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
                  {t("chat.createTicket")}
                </button>
              )}
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
                {t("chat.newConversation")}
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
                {t("chat.pendingAttachments")}
              </p>
              <ChatAttachmentList
                attachments={pendingAttachments}
                onRemove={removePendingAttachment}
                variant="pending"
              />
            </div>
          )}

          {(attachError || dictationError) && (
            <p className="mb-2 text-xs text-danger">
              {attachError || dictationError}
            </p>
          )}

          <div className="flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || pendingAttachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
              className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center self-end rounded-xl border border-border bg-base text-ink-muted transition-colors hover:border-brand/50 hover:text-brand disabled:cursor-not-allowed disabled:opacity-40"
              title={t("chat.attachTitle")}
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
            {dictationSupported && (
              <button
                type="button"
                onClick={() => {
                  clearDictationError();
                  toggleDictation(input);
                  inputRef.current?.focus();
                }}
                disabled={loading || conversationResolved}
                aria-pressed={dictating}
                aria-label={dictating ? t("chat.dictationStop") : t("chat.dictationStart")}
                title={dictating ? t("chat.dictationStop") : t("chat.dictationStart")}
                className={[
                  "inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center self-end rounded-xl border transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  dictating
                    ? "border-danger/60 bg-danger/10 text-danger animate-pulse"
                    : "border-border bg-base text-ink-muted hover:border-brand/50 hover:text-brand",
                ].join(" ")}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 11a7 7 0 0 1-14 0M12 18v3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                if (dictating) stopDictation();
                setInput(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              disabled={loading}
              rows={2}
              placeholder={
                dictating
                  ? t("chat.listening")
                  : t("chat.placeholder")
              }
              className={[
                "min-h-[52px] flex-1 resize-none rounded-xl border bg-base px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint disabled:opacity-60",
                dictating
                  ? "border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger/20"
                  : "border-border focus:border-brand focus:ring-2 focus:ring-brand/20",
              ].join(" ")}
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
              {t("chat.send")}
            </button>
          </div>
          {dictating && (
            <p className="mt-2 text-center text-xs font-medium text-danger">
              {t("chat.dictationOn")}
            </p>
          )}
          {operatorActive && !conversationResolved && (
            <p className="mt-2 text-center text-xs text-ok">
              {t("chat.talkingToHuman")}
            </p>
          )}
        </div>
      </div>
      </div>

      {!embed && (
        <ChatResultsSidebar
          messages={messages}
          searching={kbSearching}
          onKbFeedback={handleSidebarKbFeedback}
          onRemoveSparePart={handleRemoveSparePart}
        />
      )}
      {embed && overlayResultsOpen && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-10 bg-ink/20"
            aria-label={t("results.close")}
            onClick={() => setOverlayResultsOpen(false)}
          />
          <ChatResultsSidebar
            overlay
            messages={messages}
            searching={kbSearching}
            onKbFeedback={handleSidebarKbFeedback}
            onClose={() => setOverlayResultsOpen(false)}
            onRemoveSparePart={handleRemoveSparePart}
          />
        </>
      )}
      {embed &&
        !overlayResultsOpen &&
        (chatResults.hasResults || kbSearching) && (
          <button
            type="button"
            onClick={() => setOverlayResultsOpen(true)}
            className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col items-center gap-1 rounded-l-xl border border-r-0 border-border bg-surface px-2 py-3 text-[10px] font-semibold uppercase tracking-wider text-brand shadow-lg shadow-black/10"
            aria-label={t("results.open")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
            </svg>
            {t("results.title")}
            {chatResults.hasResults && (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 tabular-nums">
                {chatResults.spareParts.length +
                  (chatResults.kbMatch ? 1 : 0) +
                  (chatResults.ticket ? 1 : 0)}
              </span>
            )}
          </button>
        )}
    </div>
  );
}

function MessageBubble({
  message,
  quickReplies,
  onQuickReply,
  quickRepliesDisabled,
}: {
  message: DisplayMessage;
  quickReplies?: DisplayMessage["quickReplies"];
  onQuickReply: (value: string) => void;
  quickRepliesDisabled?: boolean;
}) {
  const isUser = message.role === "user";
  const { t } = useI18n();
  const isSystem =
    message.content.includes("operatore sta gestendo") ||
    message.content.includes("inoltrato all'operatore") ||
    message.content.includes("agente umano") ||
    message.content.includes("conversazione è stata chiusa") ||
    message.content.includes("forwarded to the operator") ||
    message.content.includes("human agent") ||
    message.content.includes("conversation has been closed");

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
            {isSystem
              ? t("chat.system")
              : message.isOperatorReply
                ? t("chat.operator")
                : t("chat.assistant")}
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
  const { t } = useI18n();
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
          {t("chat.assistant")}
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
              ? t("chat.searchingKb")
              : t("chat.typing")}
          </span>
        </div>
      </div>
    </div>
  );
}
