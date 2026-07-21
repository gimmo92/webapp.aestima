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

/** Converte file dal browser in documenti sorgente per l'archivio demo. */
export function filesToSourceFiles(files: File[]): SourceFile[] {
  const out: SourceFile[] = [];

  for (const file of files) {
    const ext = parseExt(file.name);
    if (!ext) continue;

    const canPreview = ext === "xlsx" || ext === "pdf";
    out.push({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      ext,
      sizeLabel: formatSize(file.size),
      modified: formatDate(file.lastModified),
      preview: `File caricato dall'operatore: ${file.name}`,
      classification: inferClassificationFromName(file.name, ext),
      uploaded: true,
      publicUrl: canPreview ? URL.createObjectURL(file) : undefined,
    });
  }

  return out;
}

export function revokeSourceFileUrl(file: SourceFile): void {
  if (file.publicUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(file.publicUrl);
  }
}

export const UPLOAD_ACCEPT = ACCEPTED_EXT.map((e) => `.${e}`).join(",");
