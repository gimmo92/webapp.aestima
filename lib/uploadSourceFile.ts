import type { FileExt, SourceFile } from "./archiveTypes";
import { inferClassificationFromName } from "./classifyHeuristics";

const ACCEPTED_EXT: FileExt[] = ["pdf", "xlsx", "jpg", "png", "dwg", "docx"];

function parseExt(name: string): FileExt | null {
  const match = name.match(/\.([a-z0-9]+)$/i);
  if (!match) return null;
  const ext = match[1].toLowerCase() as FileExt;
  return ACCEPTED_EXT.includes(ext) ? ext : null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Converte un singolo File del browser in documento sorgente. */
export function fileToSourceFile(
  file: File,
  opts?: { id?: string; publicUrl?: string }
): SourceFile | null {
  const ext = parseExt(file.name);
  if (!ext) return null;

  const canPreview =
    ext === "xlsx" || ext === "pdf" || ext === "jpg" || ext === "png";
  return {
    id: opts?.id ?? `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: file.name,
    ext,
    sizeLabel: formatSize(file.size),
    modified: formatDate(file.lastModified),
    preview: `File caricato dall'operatore: ${file.name}`,
    classification: inferClassificationFromName(file.name, ext),
    uploaded: true,
    publicUrl:
      opts?.publicUrl ??
      (canPreview ? URL.createObjectURL(file) : undefined),
  };
}

/** Converte file dal browser in documenti sorgente per l'archivio. */
export function filesToSourceFiles(files: File[]): SourceFile[] {
  const out: SourceFile[] = [];
  for (const file of files) {
    const src = fileToSourceFile(file);
    if (src) out.push(src);
  }
  return out;
}

export { parseExt, formatSize, formatDate };

export function revokeSourceFileUrl(file: SourceFile): void {
  if (file.publicUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(file.publicUrl);
  }
}

export const UPLOAD_ACCEPT = ACCEPTED_EXT.map((e) => `.${e}`).join(",");
