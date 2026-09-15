"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  WA_CHATS,
  WA_PROFILE,
  formatAudioDuration,
  formatFileSize,
  previewOfMessage,
  type WaChat,
  type WaMessage,
} from "@/lib/whatsappData";
import { VoiceNote } from "./VoiceNote";
import {
  IconArchive,
  IconChannels,
  IconChats,
  IconChecks,
  IconChevronDown,
  IconCommunities,
  IconDocument,
  IconDownload,
  IconEmoji,
  IconImage,
  IconMenu,
  IconMic,
  IconMuted,
  IconNewChat,
  IconPaperclip,
  IconPhone,
  IconSearch,
  IconSend,
  IconSettings,
  IconStatus,
  IconTrash,
  IconVideo,
} from "./WaIcons";

// Sfondo della conversazione: mask ufficiale WhatsApp (doodle) colorata via CSS.
const WALLPAPER_MASK: React.CSSProperties = {
  maskImage: "url(/whatsapp/chat-bg.svg)",
  WebkitMaskImage: "url(/whatsapp/chat-bg.svg)",
  maskRepeat: "repeat",
  WebkitMaskRepeat: "repeat",
  maskSize: "374px 666px",
  WebkitMaskSize: "374px 666px",
  backgroundColor: "#0b141a",
  opacity: 0.06,
};

type ListFilter = "all" | "unread" | "favorites";

const LIST_FILTERS: { id: ListFilter; label: string }[] = [
  { id: "all", label: "Tutte" },
  { id: "unread", label: "Da leggere" },
  { id: "favorites", label: "Preferiti" },
];

function nowLabel(): string {
  return new Date().toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function WhatsAppWorkspace() {
  const [chats, setChats] = useState<WaChat[]>(WA_CHATS);
  const [activeId, setActiveId] = useState(WA_CHATS[0].id);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ListFilter>("all");
  const [draft, setDraft] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);

  const activeChat = chats.find((chat) => chat.id === activeId) ?? chats[0];

  const visibleChats = useMemo(() => {
    const query = search.trim().toLowerCase();
    return chats.filter((chat) => {
      if (filter === "unread" && chat.unread === 0) return false;
      if (filter === "favorites" && !chat.favorite) return false;
      if (!query) return true;
      const last = chat.messages[chat.messages.length - 1];
      return (
        chat.name.toLowerCase().includes(query) ||
        (last ? previewOfMessage(last).toLowerCase().includes(query) : false)
      );
    });
  }, [chats, filter, search]);

  const unreadTotal = chats.reduce((sum, chat) => sum + chat.unread, 0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [activeId, activeChat.messages.length]);

  // Cronometro del vocale in registrazione.
  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  function selectChat(chatId: string) {
    setActiveId(chatId);
    setChats((prev) =>
      prev.map((chat) => (chat.id === chatId ? { ...chat, unread: 0 } : chat))
    );
  }

  /** Aggiunge un messaggio in uscita alla chat attiva e simula le spunte. */
  function sendOutgoing(payload: Partial<WaMessage> & { kind: WaMessage["kind"] }) {
    const message: WaMessage = {
      id: `out-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      direction: "out",
      status: "sent",
      timeLabel: nowLabel(),
      ...payload,
    };

    setChats((prev) => {
      const updated = prev.map((chat) =>
        chat.id === activeId
          ? {
              ...chat,
              unread: 0,
              lastLabel: message.timeLabel,
              messages: [...chat.messages, message],
            }
          : chat
      );
      const current = updated.find((chat) => chat.id === activeId);
      if (!current) return updated;
      return [current, ...updated.filter((chat) => chat.id !== activeId)];
    });

    const advance = (status: WaMessage["status"]) =>
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeId
            ? {
                ...chat,
                messages: chat.messages.map((item) =>
                  item.id === message.id ? { ...item, status } : item
                ),
              }
            : chat
        )
      );

    window.setTimeout(() => advance("delivered"), 700);
    window.setTimeout(() => advance("read"), 2200);
  }

  function sendText() {
    const text = draft.trim();
    if (!text) return;
    sendOutgoing({ kind: "text", text });
    setDraft("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function openFilePicker(accept: string) {
    setAttachOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      if (isImageFile(file)) {
        sendOutgoing({ kind: "image", imageUrl: url });
      } else {
        sendOutgoing({
          kind: "document",
          fileName: file.name,
          fileInfo: `${file.type || "File"} · ${formatFileSize(file.size)}`,
          fileUrl: url,
        });
      }
    });
  }

  async function startRecording() {
    setMicError(null);
    setAttachOpen(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const elapsed = (Date.now() - startedAtRef.current) / 1000;
        setRecording(false);
        setRecordSeconds(0);
        if (cancelledRef.current) return;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;
        sendOutgoing({
          kind: "audio",
          audioUrl: URL.createObjectURL(blob),
          audioSeconds: Math.max(1, Math.round(elapsed)),
        });
      };

      recorder.start();
      recorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setRecordSeconds(0);
      setRecording(true);
    } catch {
      setMicError(
        "Microfono non disponibile: consenti l'accesso dal browser e riprova."
      );
    }
  }

  function stopRecording(cancel: boolean) {
    cancelledRef.current = cancel;
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0f2f5] text-[#111b21]">
      <RailSidebar unreadTotal={unreadTotal} />

      <section className="flex w-[30rem] min-w-[22rem] shrink-0 flex-col border-r border-[#e9edef] bg-white">
        <header className="flex items-center justify-between px-5 pt-5 pb-1.5">
          <h1 className="text-[1.6rem] font-bold tracking-tight">Chat</h1>
          <div className="flex items-center gap-1 text-[#54656f]">
            <InertButton label="Menu">
              <IconMenu size={20} />
            </InertButton>
            <button
              type="button"
              aria-label="Nuova chat"
              className="ml-1 flex h-9 w-9 items-center justify-center rounded-xl bg-[#00a884] text-white shadow-sm transition hover:bg-[#02916f]"
            >
              <IconNewChat size={20} />
            </button>
          </div>
        </header>

        <div className="px-3 py-2">
          <div className="flex items-center gap-3 rounded-full bg-[#f0f2f5] px-4 py-2">
            <IconSearch size={18} className="text-[#54656f]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca o avvia una nuova chat"
              className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#8696a0]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 pb-2">
          {LIST_FILTERS.map((item) => {
            const active = filter === item.id;
            const badge =
              item.id === "unread" && unreadTotal > 0 ? ` ${unreadTotal}` : "";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`rounded-full px-3 py-1 text-[13px] font-medium transition ${
                  active
                    ? "bg-[#d9fdd3] text-[#046a4f]"
                    : "bg-[#f0f2f5] text-[#54656f] hover:bg-[#e9edef]"
                }`}
              >
                {item.label}
                {badge}
              </button>
            );
          })}
          <InertButton label="Altri filtri" className="ml-auto">
            <IconChevronDown size={18} />
          </InertButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visibleChats.length === 0 ? (
            <p className="px-6 py-10 text-center text-[13px] text-[#8696a0]">
              Nessuna chat trovata.
            </p>
          ) : (
            visibleChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeId}
                onSelect={() => selectChat(chat.id)}
              />
            ))
          )}
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-[#e9edef] bg-[#f0f2f5] px-4 py-2.5">
          <Avatar
            initials={activeChat.initials}
            color={activeChat.avatarColor}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-medium leading-tight">
              {activeChat.name}
            </p>
            <p className="truncate text-[12.5px] text-[#667781]">
              {activeChat.presence}
            </p>
          </div>
          <div className="flex items-center gap-1 text-[#54656f]">
            <InertButton label="Videochiamata">
              <IconVideo size={21} />
            </InertButton>
            <InertButton label="Chiamata">
              <IconPhone size={21} />
            </InertButton>
            <InertButton label="Cerca nella chat">
              <IconSearch size={21} />
            </InertButton>
            <InertButton label="Menu chat">
              <IconMenu size={20} />
            </InertButton>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 bg-[#efeae2]">
          {/* Livello doodle: resta fisso mentre i messaggi scorrono. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={WALLPAPER_MASK}
          />
          <div className="relative h-full overflow-y-auto px-[5%] py-5">
            <div className="mx-auto flex max-w-[60rem] flex-col gap-2">
              <p className="mx-auto mb-2 max-w-[34rem] rounded-lg bg-[#ffeecd] px-3 py-2 text-center text-[12.5px] text-[#54656f] shadow-sm">
                Richieste di assistenza macchinari ricevute su WhatsApp
                Business. Dati dimostrativi.
              </p>
              {activeChat.messages.map((message) => (
                <div key={message.id}>
                  {message.dayLabel ? (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-lg bg-white px-3 py-1 text-[12px] font-medium uppercase tracking-wide text-[#54656f] shadow-sm">
                        {message.dayLabel}
                      </span>
                    </div>
                  ) : null}
                  <MessageRow
                    message={message}
                    chat={activeChat}
                    showAuthor={Boolean(activeChat.isGroup)}
                  />
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>
        </div>

        <footer className="relative border-t border-[#e9edef] bg-[#f0f2f5] px-4 py-2.5">
          {micError ? (
            <p className="mb-2 rounded-md bg-[#fdecea] px-3 py-1.5 text-[12.5px] text-[#b3261e]">
              {micError}
            </p>
          ) : null}

          {attachOpen ? (
            <>
              <button
                type="button"
                aria-label="Chiudi menu allegati"
                onClick={() => setAttachOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute bottom-16 left-4 z-20 w-56 overflow-hidden rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-black/5">
                <AttachMenuItem
                  icon={<IconDocument size={20} />}
                  label="Documento"
                  color="#7f66ff"
                  onClick={() => openFilePicker("")}
                />
                <AttachMenuItem
                  icon={<IconImage size={20} />}
                  label="Foto e video"
                  color="#007bfc"
                  onClick={() => openFilePicker("image/*,video/*")}
                />
              </div>
            </>
          ) : null}

          {recording ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => stopRecording(true)}
                aria-label="Annulla registrazione"
                className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5"
              >
                <IconTrash size={21} />
              </button>
              <div className="flex flex-1 items-center gap-3 rounded-lg bg-white px-4 py-2.5">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#ea4335]" />
                <span className="font-mono text-[14px] text-[#111b21]">
                  {formatAudioDuration(recordSeconds)}
                </span>
                <span className="text-[13px] text-[#8696a0]">
                  Registrazione in corso…
                </span>
              </div>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                aria-label="Invia messaggio vocale"
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#02916f]"
              >
                <IconSend size={21} />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setAttachOpen((prev) => !prev)}
                aria-label="Allega"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5"
              >
                <IconPaperclip size={22} />
              </button>
              <InertButton label="Emoji" className="h-10 w-10 shrink-0">
                <IconEmoji size={22} />
              </InertButton>
              <textarea
                ref={textareaRef}
                rows={1}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  const el = event.target;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendText();
                  }
                }}
                placeholder="Scrivi un messaggio"
                className="max-h-36 min-h-[2.75rem] flex-1 resize-none rounded-lg bg-white px-4 py-3 text-[15px] leading-5 outline-none placeholder:text-[#8696a0]"
              />
              {draft.trim() ? (
                <button
                  type="button"
                  onClick={sendText}
                  aria-label="Invia messaggio"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#02916f]"
                >
                  <IconSend size={21} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  aria-label="Registra messaggio vocale"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition hover:bg-[#02916f]"
                >
                  <IconMic size={21} />
                </button>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(event) => handleFiles(event.target.files)}
            className="hidden"
          />
        </footer>
      </section>
    </div>
  );
}

function RailSidebar({ unreadTotal }: { unreadTotal: number }) {
  return (
    <nav className="flex w-16 shrink-0 flex-col items-center justify-between border-r border-[#e9edef] bg-[#f7f5f3] py-3">
      <div className="flex flex-col items-center gap-1.5">
        <RailButton label="Chat" active badge={unreadTotal}>
          <IconChats size={24} />
        </RailButton>
        <RailButton label="Chiamate">
          <IconPhone size={24} />
        </RailButton>
        <RailButton label="Stato">
          <IconStatus size={24} />
        </RailButton>
        <RailButton label="Canali">
          <IconChannels size={24} />
        </RailButton>
        <RailButton label="Community">
          <IconCommunities size={24} />
        </RailButton>
        <RailButton label="Archiviate">
          <IconArchive size={24} />
        </RailButton>
      </div>
      <div className="flex flex-col items-center gap-2">
        <RailButton label="Impostazioni">
          <IconSettings size={23} />
        </RailButton>
        <Avatar
          initials={WA_PROFILE.initials}
          color={WA_PROFILE.avatarColor}
          size={30}
        />
      </div>
    </nav>
  );
}

function RailButton({
  children,
  label,
  active,
  badge = 0,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`relative flex h-11 w-11 cursor-default items-center justify-center rounded-full ${
        active ? "bg-[#e7e0da] text-[#111b21]" : "text-[#54656f]"
      }`}
    >
      {children}
      {badge > 0 ? (
        <span className="absolute -right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#25d366] px-1 text-[10.5px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </span>
  );
}

/** Pulsante decorativo: presente nel clone, non operativo in questa demo. */
function InertButton({
  children,
  label,
  className = "",
}: {
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`flex h-9 w-9 cursor-default items-center justify-center rounded-full text-[#54656f] ${className}`}
    >
      {children}
    </span>
  );
}

function Avatar({
  initials,
  color,
  size,
}: {
  initials: string;
  color: string;
  size: number;
}) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        fontSize: Math.round(size * 0.36),
      }}
    >
      {initials}
    </span>
  );
}

function ChatListItem({
  chat,
  active,
  onSelect,
}: {
  chat: WaChat;
  active: boolean;
  onSelect: () => void;
}) {
  const last = chat.messages[chat.messages.length - 1];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition ${
        active ? "bg-[#f0f2f5]" : "hover:bg-[#f5f6f6]"
      }`}
    >
      <Avatar initials={chat.initials} color={chat.avatarColor} size={49} />
      <span className="min-w-0 flex-1 border-b border-[#f0f2f5] pb-2.5">
        <span className="flex items-baseline gap-2">
          <span className="min-w-0 flex-1 truncate text-[16px] leading-tight">
            {chat.name}
          </span>
          <span
            className={`shrink-0 text-[12px] ${
              chat.unread > 0 ? "font-medium text-[#00a884]" : "text-[#667781]"
            }`}
          >
            {chat.lastLabel}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {last?.direction === "out" ? (
            <IconChecks
              double={last.status !== "sent"}
              className={
                last.status === "read" ? "text-[#53bdeb]" : "text-[#8696a0]"
              }
            />
          ) : null}
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#667781]">
            {last ? previewOfMessage(last) : "Nessun messaggio"}
          </span>
          {chat.muted ? (
            <IconMuted size={16} className="shrink-0 text-[#8696a0]" />
          ) : null}
          {chat.unread > 0 ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11.5px] font-semibold text-white">
              {chat.unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

function MessageRow({
  message,
  chat,
  showAuthor,
}: {
  message: WaMessage;
  chat: WaChat;
  showAuthor: boolean;
}) {
  const outgoing = message.direction === "out";
  const bubbleColor = outgoing ? "#d9fdd3" : "#ffffff";
  // Nei messaggi di solo testo l'orario sta sulla stessa riga (come l'originale);
  // con foto, file o vocali va su una riga propria in basso a destra.
  const inlineMeta = message.kind === "text";

  const meta = (
    <span className="flex items-center gap-1 text-[11px] text-[#667781]">
      {message.timeLabel}
      {outgoing ? (
        <IconChecks
          double={message.status !== "sent"}
          className={
            message.status === "read" ? "text-[#53bdeb]" : "text-[#8696a0]"
          }
        />
      ) : null}
    </span>
  );

  return (
    <div className={`flex ${outgoing ? "justify-end" : "justify-start"}`}>
      <div
        className="relative max-w-[65%] rounded-lg px-2 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]"
        style={{ backgroundColor: bubbleColor }}
      >
        <BubbleTail outgoing={outgoing} color={bubbleColor} />

        {showAuthor && !outgoing && message.author ? (
          <p
            className="px-1 pb-0.5 text-[13px] font-semibold"
            style={{ color: message.authorColor ?? "#1f7aec" }}
          >
            {message.author}
          </p>
        ) : null}

        {message.quoted ? (
          <div className="mb-1 overflow-hidden rounded-md border-l-4 border-[#06cf9c] bg-black/5 px-2.5 py-1.5">
            <p className="text-[12.5px] font-semibold text-[#06cf9c]">
              {message.quoted.author}
            </p>
            <p className="line-clamp-2 text-[13px] text-[#667781]">
              {message.quoted.text}
            </p>
          </div>
        ) : null}

        {message.kind === "image" && message.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.imageUrl}
            alt={message.text ?? "Foto allegata"}
            className="mb-1 max-h-80 w-full max-w-[20rem] rounded-md object-cover"
          />
        ) : null}

        {message.kind === "document" ? (
          <div className="mb-1 flex w-[19rem] max-w-full items-center gap-3 rounded-md bg-black/5 px-3 py-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#d9534f]">
              <IconDocument size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">
                {message.fileName}
              </span>
              <span className="block truncate text-[12px] text-[#667781]">
                {message.fileInfo}
              </span>
            </span>
            {message.fileUrl ? (
              <a
                href={message.fileUrl}
                download={message.fileName}
                aria-label="Scarica allegato"
                className="text-[#54656f] transition hover:text-[#111b21]"
              >
                <IconDownload size={20} />
              </a>
            ) : (
              <span className="text-[#8696a0]">
                <IconDownload size={20} />
              </span>
            )}
          </div>
        ) : null}

        {message.kind === "audio" ? (
          <VoiceNote
            messageId={message.id}
            seconds={message.audioSeconds ?? 0}
            audioUrl={message.audioUrl}
            outgoing={outgoing}
            initials={outgoing ? WA_PROFILE.initials : chat.initials}
            avatarColor={outgoing ? WA_PROFILE.avatarColor : chat.avatarColor}
          />
        ) : null}

        {message.text && message.kind !== "audio" ? (
          <p className="whitespace-pre-wrap break-words px-1 text-[14.5px] leading-[19px]">
            {message.text}
            {inlineMeta ? (
              <span className="inline-block w-[4.6rem] select-none align-bottom" />
            ) : null}
          </p>
        ) : null}

        {inlineMeta ? (
          <span className="pointer-events-none absolute bottom-1.5 right-2.5">
            {meta}
          </span>
        ) : (
          <span className="flex justify-end px-1 pb-0.5">{meta}</span>
        )}
      </div>
    </div>
  );
}

function BubbleTail({
  outgoing,
  color,
}: {
  outgoing: boolean;
  color: string;
}) {
  return (
    <svg
      width="9"
      height="13"
      viewBox="0 0 9 13"
      className={`absolute top-0 ${outgoing ? "-right-[8px]" : "-left-[8px]"}`}
      style={{ color }}
      aria-hidden
    >
      <path
        fill="currentColor"
        d={outgoing ? "M0 0h9L0 11z" : "M9 0H0l9 11z"}
      />
    </svg>
  );
}

function AttachMenuItem({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 px-4 py-2.5 text-left text-[14.5px] transition hover:bg-[#f5f6f6]"
    >
      <span style={{ color }}>{icon}</span>
      {label}
    </button>
  );
}
