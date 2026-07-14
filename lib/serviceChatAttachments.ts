// Utility per allegati nella chat assistenza (solo stato React, no localStorage).

export type ChatAttachmentKind = "image" | "document";

/** Payload inviato all'API (senza object URL). */
export interface ChatAttachmentPayload {
  name: string;
  mimeType: string;
  size: number;
  kind: ChatAttachmentKind;
  /** Base64 raw — solo immagini, per vision Claude. */
  dataBase64?: string;
}

/** Allegato in UI con anteprima locale (object URL). */
export interface ChatAttachment extends ChatAttachmentPayload {
  id: string;
  previewUrl?: string;
}

export const CHAT_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.pdf,.doc,.docx,.xls,.xlsx,.txt,application/pdf";

export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Lettura file non valida."));
        return;
      }
      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Codifica base64 fallita."));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Errore lettura file."));
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentKindFromFile(file: File): ChatAttachmentKind {
  return file.type.startsWith("image/") || ALLOWED_IMAGE_TYPES.has(file.type)
    ? "image"
    : "document";
}

export function validateChatFile(file: File): string | null {
  const kind = attachmentKindFromFile(file);
  if (kind === "image") {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return "Formato immagine non supportato. Usa JPG, PNG, WebP o GIF.";
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return `Immagine troppo grande (max ${formatFileSize(MAX_IMAGE_BYTES)}).`;
    }
    return null;
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `Documento troppo grande (max ${formatFileSize(MAX_DOCUMENT_BYTES)}).`;
  }
  return null;
}

let attachSeq = 0;

export async function fileToChatAttachment(file: File): Promise<ChatAttachment> {
  const err = validateChatFile(file);
  if (err) throw new Error(err);

  const kind = attachmentKindFromFile(file);
  attachSeq += 1;
  const id = `att-${Date.now()}-${attachSeq}`;

  if (kind === "image") {
    const dataBase64 = await readFileAsBase64(file);
    return {
      id,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      kind,
      dataBase64,
      previewUrl: URL.createObjectURL(file),
    };
  }

  return {
    id,
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    kind,
  };
}

export function toAttachmentPayload(att: ChatAttachment): ChatAttachmentPayload {
  return {
    name: att.name,
    mimeType: att.mimeType,
    size: att.size,
    kind: att.kind,
    dataBase64: att.dataBase64,
  };
}

export function revokeAttachmentUrls(attachments: ChatAttachment[]): void {
  for (const att of attachments) {
    if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
  }
}

export function documentAttachmentNote(att: ChatAttachmentPayload): string {
  return `[Documento allegato: ${att.name} (${att.mimeType}, ${formatFileSize(att.size)})]`;
}
