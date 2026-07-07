// Endpoint REST demo per i documenti in archivio.

export function archiveFileApiUrl(fileId: string, origin = ""): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/api/archive/files/${fileId}`;
}

export function archiveFileCurl(fileId: string, origin?: string): string {
  return `curl -s "${archiveFileApiUrl(fileId, origin)}"`;
}
