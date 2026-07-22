import type { FileClassification, FileExt, SourceFile } from "./archiveTypes";

const IDB_NAME = "aestima-archive";
const IDB_STORE = "files";
const IDB_VERSION = 1;

export type PersistedArchiveFile = SourceFile & {
  /** Contenuto binario solo per fallback ospite (IndexedDB). */
  contentBase64?: string;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbPut(file: PersistedArchiveFile): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(file);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB put failed"));
  });
  db.close();
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
  });
  db.close();
}

async function idbGetAll(): Promise<PersistedArchiveFile[]> {
  const db = await openDb();
  const rows = await new Promise<PersistedArchiveFile[]>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve((req.result as PersistedArchiveFile[]) ?? []);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB getAll failed"));
  });
  db.close();
  return rows;
}

function base64ToBlob(base64: string, mimeType?: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Carica i file archivio salvati in locale (ospite / offline). */
export async function loadLocalArchiveFiles(): Promise<SourceFile[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const rows = await idbGetAll();
    return rows.map((row) => {
      const { contentBase64, ...meta } = row;
      let publicUrl = meta.publicUrl;
      if (contentBase64 && (!publicUrl || publicUrl.startsWith("blob:"))) {
        publicUrl = URL.createObjectURL(
          base64ToBlob(contentBase64, undefined)
        );
      }
      return { ...meta, publicUrl, uploaded: true };
    });
  } catch (err) {
    console.error("loadLocalArchiveFiles", err);
    return [];
  }
}

/** Salva/aggiorna metadati (+ contenuto) in IndexedDB. */
export async function saveLocalArchiveFile(
  file: SourceFile,
  contentBase64?: string
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const row: PersistedArchiveFile = {
      ...file,
      publicUrl: file.publicUrl?.startsWith("blob:") ? undefined : file.publicUrl,
      contentBase64,
    };
    await idbPut(row);
  } catch (err) {
    console.error("saveLocalArchiveFile", err);
  }
}

export async function deleteLocalArchiveFile(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    await idbDelete(id);
  } catch (err) {
    console.error("deleteLocalArchiveFile", err);
  }
}

export async function updateLocalArchiveMeta(
  id: string,
  patch: {
    classification?: FileClassification;
    resolvedSerial?: string | null;
  }
): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const rows = await idbGetAll();
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    if (patch.classification) row.classification = patch.classification;
    if (patch.resolvedSerial !== undefined) {
      row.correctSerial = patch.resolvedSerial ?? undefined;
    }
    await idbPut(row);
  } catch (err) {
    console.error("updateLocalArchiveMeta", err);
  }
}

type UploadApiResponse = {
  files?: SourceFile[];
  error?: string;
};

/** Carica file sul server (company autenticata) o in IndexedDB (ospite). */
export async function uploadArchiveFiles(files: File[]): Promise<{
  files: SourceFile[];
  cloud: boolean;
}> {
  if (files.length === 0) return { files: [], cloud: false };

  const form = new FormData();
  for (const f of files) form.append("files", f);

  try {
    const res = await fetch("/api/archive/upload", {
      method: "POST",
      body: form,
    });
    if (res.status === 401) {
      return { files: await persistLocalUploads(files), cloud: false };
    }
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as UploadApiResponse | null;
      throw new Error(data?.error || "Upload fallito");
    }
    const data = (await res.json()) as UploadApiResponse;
    return { files: data.files ?? [], cloud: true };
  } catch (err) {
    console.error("uploadArchiveFiles cloud failed, fallback local", err);
    return { files: await persistLocalUploads(files), cloud: false };
  }
}

async function persistLocalUploads(files: File[]): Promise<SourceFile[]> {
  const { fileToSourceFile } = await import("./uploadSourceFile");
  const added: SourceFile[] = [];
  for (const file of files) {
    const src = fileToSourceFile(file);
    if (!src) continue;
    const contentBase64 = await fileToBase64(file);
    await saveLocalArchiveFile(src, contentBase64);
    added.push(src);
  }
  return added;
}

export function archiveContentUrl(id: string): string {
  return `/api/archive/files/${id}/content`;
}

export function isPersistedArchiveId(id: string): boolean {
  return !id.startsWith("upload-") && !id.startsWith("src-");
}

export type { FileExt };
