"use client";

import type { ChatAttachment } from "@/lib/serviceChatAttachments";
import { formatFileSize } from "@/lib/serviceChatAttachments";

interface Props {
  attachments: ChatAttachment[];
  onRemove?: (id: string) => void;
  variant?: "pending" | "message";
  isUserMessage?: boolean;
}

/** Anteprima allegati in composer o dentro la bolla messaggio. */
export function ChatAttachmentList({
  attachments,
  onRemove,
  variant = "message",
  isUserMessage = false,
}: Props) {
  if (attachments.length === 0) return null;

  const pending = variant === "pending";

  return (
    <div
      className={[
        "flex flex-wrap gap-2",
        pending ? "mt-0" : "mt-3",
      ].join(" ")}
    >
      {attachments.map((att) => (
        <AttachmentChip
          key={att.id}
          attachment={att}
          onRemove={onRemove ? () => onRemove(att.id) : undefined}
          pending={pending}
          isUserMessage={isUserMessage}
        />
      ))}
    </div>
  );
}

function AttachmentChip({
  attachment,
  onRemove,
  pending,
  isUserMessage,
}: {
  attachment: ChatAttachment;
  onRemove?: () => void;
  pending: boolean;
  isUserMessage: boolean;
}) {
  const isImage = attachment.kind === "image" && attachment.previewUrl;

  if (isImage) {
    return (
      <div
        className={[
          "group relative overflow-hidden rounded-lg border",
          pending
            ? "border-border bg-base"
            : isUserMessage
              ? "border-white/25 bg-white/10"
              : "border-border bg-base/80",
        ].join(" ")}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.previewUrl}
          alt={attachment.name}
          className="h-24 w-28 object-cover"
        />
        <div
          className={[
            "absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] font-medium backdrop-blur-sm",
            isUserMessage ? "bg-black/40 text-white" : "bg-black/50 text-ink",
          ].join(" ")}
        >
          <span className="block truncate">{attachment.name}</span>
        </div>
        {onRemove && (
          <RemoveButton onClick={onRemove} light={isUserMessage && !pending} />
        )}
      </div>
    );
  }

  return (
    <div
      className={[
        "relative flex max-w-[220px] items-center gap-2 rounded-lg border px-3 py-2",
        pending
          ? "border-border bg-base"
          : isUserMessage
            ? "border-white/25 bg-white/10 text-white"
            : "border-border bg-base/80 text-ink",
      ].join(" ")}
    >
      <span
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          isUserMessage && !pending ? "bg-white/15" : "bg-brand-soft text-brand",
        ].join(" ")}
      >
        <DocIcon />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{attachment.name}</p>
        <p
          className={[
            "text-[10px]",
            isUserMessage && !pending ? "text-white/70" : "text-ink-faint",
          ].join(" ")}
        >
          {formatFileSize(attachment.size)}
        </p>
      </div>
      {onRemove && (
        <RemoveButton onClick={onRemove} light={isUserMessage && !pending} />
      )}
    </div>
  );
}

function RemoveButton({
  onClick,
  light,
}: {
  onClick: () => void;
  light?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "absolute right-1 top-1 rounded-full p-0.5 transition-colors",
        light
          ? "bg-black/30 text-white hover:bg-black/50"
          : "bg-surface text-ink-faint hover:bg-surface-2 hover:text-ink",
      ].join(" ")}
      aria-label="Rimuovi allegato"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path
          d="M18 6 6 18M6 6l12 12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 2v6h6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
