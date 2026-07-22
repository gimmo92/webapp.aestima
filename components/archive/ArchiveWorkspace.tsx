"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { REVIEW_THRESHOLD, SOURCE_FILES, clienteForSerial } from "@/lib/archiveData";
import type {
  ArchiveAssignment,
  ArchivedDoc,
  ClassifyResult,
  SourceFile,
} from "@/lib/archiveTypes";
import { revokeSourceFileUrl } from "@/lib/uploadSourceFile";
import {
  deleteLocalArchiveFile,
  loadLocalArchiveFiles,
  updateLocalArchiveMeta,
  uploadArchiveFiles,
} from "@/lib/archivePersist";
import { persistWorkspace } from "@/lib/workspace/persistClient";
import { computeArchiveGaps } from "@/lib/archiveGaps";
import { computeSparePartGaps } from "@/lib/sparePartGaps";
import { setPartUnitPrice } from "@/lib/bomCatalog";
import type { SparePart } from "@/lib/sparePartTypes";
import { computeSpareCompleteness } from "@/lib/sparePartTypes";
import { SourceBrowser } from "./SourceBrowser";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { OrganizedArchive, type ArchiveViewMode } from "./OrganizedArchive";
import { ReviewQueue } from "./ReviewQueue";
import { ArchiveApiModal } from "./ArchiveApiModal";
import {
  ArchiveGapsSidebar,
  type GapUpdatePayload,
} from "./ArchiveGapsSidebar";
import { PartsArchive } from "./PartsArchive";

type Phase = "source" | "processing" | "done";
type ArchiveTab = "organizzato" | "sorgente" | "verificare" | "ricambi";

function fallbackResult(f: SourceFile): ClassifyResult {
  const c = f.classification;
  return {
    id: f.id,
    tipo: c.tipo,
    macchinaSerial: c.macchinaSerial,
    cliente: c.cliente ?? clienteForSerial(c.macchinaSerial),
    codice: c.codice,
    revisione: c.revisione,
    data: c.data,
    confidence: c.confidence,
    source: c.source ?? "mock",
  };
}

function withResult(f: SourceFile, r: ClassifyResult): SourceFile {
  return {
    ...f,
    classification: {
      tipo: r.tipo,
      macchinaSerial: r.macchinaSerial,
      cliente: r.cliente ?? clienteForSerial(r.macchinaSerial),
      codice: r.codice,
      revisione: r.revisione,
      data: r.data,
      confidence: r.confidence,
      source: r.source,
    },
  };
}

function resultsFromFiles(files: SourceFile[]): Map<string, ClassifyResult> {
  return new Map(files.map((f) => [f.id, fallbackResult(f)]));
}

function resolvedSerialFromFiles(files: SourceFile[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) {
    if (f.correctSerial) out[f.id] = f.correctSerial;
  }
  return out;
}

function resolvedClienteFromFiles(files: SourceFile[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of files) {
    if (f.correctCliente) out[f.id] = f.correctCliente;
  }
  return out;
}

function isCloudArchiveId(id: string) {
  return !id.startsWith("upload-") && !id.startsWith("src-");
}

export function ArchiveWorkspace() {
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<Phase>("done");
  const [apiDone, setApiDone] = useState(true);
  const [results, setResults] = useState<Map<string, ClassifyResult>>(new Map());
  const [apiSource, setApiSource] = useState<"anthropic" | "mock">("mock");
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("organizzato");
  const [viewMode, setViewMode] = useState<ArchiveViewMode>("macchina");
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [resolvedCliente, setResolvedCliente] = useState<Record<string, string>>(
    {}
  );
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [uploadedFiles, setUploadedFiles] = useState<SourceFile[]>([]);
  const [apiFile, setApiFile] = useState<SourceFile | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [cloudMode, setCloudMode] = useState(false);
  const [priceRevision, setPriceRevision] = useState(0);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState<{
    label: string;
    pct: number;
  } | null>(null);
  const organizingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/workspace");
        if (res.ok) {
          const data = await res.json();
          const files = (data.archiveFiles as SourceFile[]) ?? [];
          if (cancelled) return;
          setCloudMode(true);
          setUploadedFiles(files);
          setResults(resultsFromFiles(files));
          setResolved(resolvedSerialFromFiles(files));
          setResolvedCliente(resolvedClienteFromFiles(files));
          setSpareParts((data.spareParts as SparePart[]) ?? []);
          setHydrated(true);
          return;
        }
      } catch {
        // fallback locale sotto
      }
      if (cancelled) return;
      const local = await loadLocalArchiveFiles();
      if (cancelled) return;
      setCloudMode(false);
      setUploadedFiles(local);
      setResults(resultsFromFiles(local));
      setResolved(resolvedSerialFromFiles(local));
      setResolvedCliente(resolvedClienteFromFiles(local));
      setSpareParts([]);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistArchive = useCallback(
    (action: string, payload: unknown) => {
      if (!cloudMode) return;
      persistWorkspace(action, payload);
    },
    [cloudMode]
  );

  const visibleFiles = useMemo(
    () => [
      ...SOURCE_FILES.filter((f) => !deletedIds.has(f.id)),
      ...uploadedFiles.filter((f) => !deletedIds.has(f.id)),
    ],
    [deletedIds, uploadedFiles]
  );

  const runOrganize = useCallback(
    async (files: SourceFile[]) => {
      if (files.length === 0 || organizingRef.current) return;
      organizingRef.current = true;
      setPhase("processing");
      setApiDone(false);
      setResolved({});
      setResolvedCliente({});
      setArchiveTab("organizzato");

      try {
        const res = await fetch("/api/classify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            files: files.map((f) => ({
              id: f.id,
              name: f.name,
              preview: f.preview,
              ext: f.ext,
            })),
          }),
        });
        const data = res.ok ? await res.json() : null;
        const list: ClassifyResult[] = data?.results ?? files.map(fallbackResult);
        setResults(new Map(list.map((r) => [r.id, r])));
        setApiSource(data?.source === "anthropic" ? "anthropic" : "mock");

        setUploadedFiles((prev) =>
          prev.map((f) => {
            const r = list.find((x) => x.id === f.id);
            if (!r) return f;
            const next = withResult(f, r);
            if (cloudMode && isCloudArchiveId(f.id)) {
              persistArchive("updateArchiveFile", {
                id: f.id,
                classification: next.classification,
                resolvedSerial: null,
                resolvedCliente: null,
              });
            } else if (!cloudMode) {
              void updateLocalArchiveMeta(f.id, {
                classification: next.classification,
                resolvedSerial: null,
                resolvedCliente: null,
              });
            }
            return next;
          })
        );
      } catch {
        setResults(new Map(files.map((f) => [f.id, fallbackResult(f)])));
        setApiSource("mock");
      } finally {
        setApiDone(true);
        organizingRef.current = false;
      }
    },
    [cloudMode, persistArchive]
  );

  const handleOrganize = useCallback(() => {
    void runOrganize(visibleFiles);
  }, [runOrganize, visibleFiles]);

  const uploadFiles = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      void (async () => {
        const { files: added, cloud } = await uploadArchiveFiles(files);
        if (added.length === 0) return;
        if (cloud) setCloudMode(true);
        setUploadedFiles((prev) => {
          const next = [...prev, ...added];
          const all = [
            ...SOURCE_FILES.filter((f) => !deletedIds.has(f.id)),
            ...next.filter((f) => !deletedIds.has(f.id)),
          ];
          queueMicrotask(() => {
            void runOrganize(all);
          });
          return next;
        });
        setResults((prev) => {
          const next = new Map(prev);
          for (const f of added) next.set(f.id, fallbackResult(f));
          return next;
        });
      })();
    },
    [deletedIds, runOrganize]
  );

  const deleteFile = useCallback(
    (fileId: string) => {
      setUploadedFiles((prev) => {
        const target = prev.find((f) => f.id === fileId);
        if (target) revokeSourceFileUrl(target);
        return prev.filter((f) => f.id !== fileId);
      });
      setDeletedIds((prev) => new Set(prev).add(fileId));
      setResolved((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setResolvedCliente((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      setResults((prev) => {
        const next = new Map(prev);
        next.delete(fileId);
        return next;
      });
      if (cloudMode && isCloudArchiveId(fileId)) {
        persistArchive("deleteArchiveFile", { id: fileId });
      } else {
        void deleteLocalArchiveFile(fileId);
      }
    },
    [cloudMode, persistArchive]
  );

  const resultFor = useCallback(
    (f: SourceFile): ClassifyResult => results.get(f.id) ?? fallbackResult(f),
    [results]
  );

  const { archived, reviewItems } = useMemo(() => {
    const archived: ArchivedDoc[] = [];
    const reviewItems: SourceFile[] = [];

    for (const f of visibleFiles) {
      const r = resultFor(f);
      const autoCliente =
        r.cliente ?? clienteForSerial(r.macchinaSerial) ?? null;
      const toDoc = (
        serial: string | null,
        cliente: string | null,
        confidence: number
      ): ArchivedDoc => ({
        file: f,
        tipo: r.tipo,
        macchinaSerial: serial,
        cliente,
        codice: r.codice,
        revisione: r.revisione,
        data: r.data,
        confidence,
        source: r.source,
      });

      const hasResolved =
        Boolean(resolved[f.id]) || Boolean(resolvedCliente[f.id]);

      if (r.confidence >= REVIEW_THRESHOLD && r.macchinaSerial) {
        archived.push(
          toDoc(
            r.macchinaSerial,
            autoCliente ?? resolvedCliente[f.id] ?? null,
            r.confidence
          )
        );
      } else if (hasResolved) {
        const serial = resolved[f.id] ?? null;
        const cliente =
          resolvedCliente[f.id] ??
          clienteForSerial(serial) ??
          autoCliente;
        archived.push(toDoc(serial, cliente, 1));
      } else {
        reviewItems.push(withResult(f, r));
      }
    }
    return { archived, reviewItems };
  }, [resultFor, resolved, resolvedCliente, visibleFiles]);

  const showApi = useCallback((file: SourceFile) => setApiFile(file), []);

  const machineCount = useMemo(
    () =>
      new Set(
        archived.map((d) => d.macchinaSerial).filter(Boolean) as string[]
      ).size,
    [archived]
  );

  const clienteCount = useMemo(
    () =>
      new Set(archived.map((d) => d.cliente).filter(Boolean) as string[]).size,
    [archived]
  );

  const gapReport = useMemo(
    () =>
      archiveTab === "ricambi"
        ? computeSparePartGaps(spareParts)
        : computeArchiveGaps(archived, visibleFiles),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- priceRevision intenzionale
    [archiveTab, spareParts, archived, visibleFiles, priceRevision]
  );

  const handleExtractParts = useCallback(async () => {
    if (extracting) return;
    setExtracting(true);
    setExtractProgress({ label: "Estrazione in corso…", pct: 5 });
    try {
      const tick = window.setInterval(() => {
        setExtractProgress((prev) =>
          prev
            ? {
                label: prev.label,
                pct: Math.min(90, prev.pct + 7),
              }
            : prev
        );
      }, 400);
      const res = await fetch("/api/archive/extract-parts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      window.clearInterval(tick);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setExtractProgress({
          label: (err as { message?: string })?.message || "Estrazione fallita",
          pct: 100,
        });
        return;
      }
      const data = await res.json();
      setSpareParts((data.parts as SparePart[]) ?? []);
      setExtractProgress({
        label: `Estratti ${data.extractedRows ?? 0} righe · ${(data.parts as SparePart[])?.length ?? 0} ricambi`,
        pct: 100,
      });
      setArchiveTab("ricambi");
    } catch {
      setExtractProgress({ label: "Errore di rete", pct: 100 });
    } finally {
      setExtracting(false);
      window.setTimeout(() => setExtractProgress(null), 4000);
    }
  }, [extracting]);

  const handleSparePatch = useCallback(
    (part: SparePart) => {
      persistWorkspace("updateSparePart", part);
    },
    []
  );

  const focusGap = useCallback(
    (q: string) => {
      if (archiveTab !== "ricambi") setArchiveTab("organizzato");
      setQuery(q);
    },
    [archiveTab]
  );

  const handleUpdateGap = useCallback(
    (payload: GapUpdatePayload) => {
      if (payload.kind === "set_price") {
        setPartUnitPrice(payload.partCode, payload.price);
        setPriceRevision((n) => n + 1);
        setSpareParts((prev) =>
          prev.map((p) => {
            if (p.codice.toUpperCase() !== payload.partCode.toUpperCase()) {
              return p;
            }
            const updated = {
              ...p,
              prezzoListino: payload.price,
            };
            updated.completezza = computeSpareCompleteness(updated);
            persistWorkspace("updateSparePart", updated);
            return updated;
          })
        );
        return;
      }

      const { fileId, code, applyToAll } = payload;

      setUploadedFiles((prev) =>
        prev.map((f) => {
          const match = applyToAll
            ? !f.classification.codice
            : f.id === fileId;
          if (!match) return f;
          const classification = { ...f.classification, codice: code };
          if (cloudMode && isCloudArchiveId(f.id)) {
            persistArchive("updateArchiveFile", {
              id: f.id,
              classification,
            });
          } else {
            void updateLocalArchiveMeta(f.id, { classification });
          }
          return { ...f, classification };
        })
      );

      setResults((prev) => {
        const next = new Map(prev);
        for (const [id, r] of next) {
          if (applyToAll) {
            if (!r.codice) next.set(id, { ...r, codice: code });
          } else if (id === fileId) {
            next.set(id, { ...r, codice: code });
          }
        }
        if (!applyToAll && !next.has(fileId)) {
          const fromUpload = uploadedFiles.find((f) => f.id === fileId);
          if (fromUpload) {
            next.set(fileId, {
              ...fallbackResult(fromUpload),
              codice: code,
            });
          }
        }
        return next;
      });
    },
    [cloudMode, persistArchive, uploadedFiles]
  );

  const onResolve = (fileId: string, assignment: ArchiveAssignment) => {
    const serial = assignment.serial?.trim() || null;
    const cliente =
      assignment.cliente?.trim() || clienteForSerial(serial) || null;
    if (!serial && !cliente) return;

    setResolved((prev) => {
      const next = { ...prev };
      if (serial) next[fileId] = serial;
      else delete next[fileId];
      return next;
    });
    setResolvedCliente((prev) => {
      const next = { ...prev };
      if (cliente) next[fileId] = cliente;
      else delete next[fileId];
      return next;
    });

    if (cloudMode && isCloudArchiveId(fileId)) {
      persistArchive("updateArchiveFile", {
        id: fileId,
        resolvedSerial: serial,
        resolvedCliente: cliente,
      });
    } else {
      void updateLocalArchiveMeta(fileId, {
        resolvedSerial: serial,
        resolvedCliente: cliente,
      });
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8 text-sm text-ink-muted">
        Caricamento archivio…
      </div>
    );
  }

  if (phase === "source") {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto p-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-2xl font-bold text-ink">
            Da file sparsi ad <span className="text-brand">archivio collegato</span>
          </h1>
          <p className="mx-auto mt-1.5 max-w-xl text-sm text-ink-muted">
            L&apos;agente di organizzazione documentale classifica i file,
            estrae i metadati e li collega alla macchina giusta, rendendo
            l&apos;archivio interrogabile.
          </p>
          <p className="mt-2 text-[11px] text-ink-faint">
            In produzione l&apos;agente si collega a una cartella cloud reale
            (Google Drive / SharePoint / Dropbox). Qui i file sono mock.
          </p>
        </div>
        <div className="min-h-0 w-full max-w-2xl flex-1">
          <SourceBrowser
            files={visibleFiles}
            onOrganize={handleOrganize}
            onDeleteFile={deleteFile}
            onShowApiFile={showApi}
            onUploadFiles={uploadFiles}
          />
        </div>
      </div>
    );
  }

  if (phase === "processing") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProcessingPipeline
          files={visibleFiles}
          apiDone={apiDone}
          onComplete={() => setPhase("done")}
          source={apiSource}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <Stat value={visibleFiles.length} label="file sorgente" />
          <Arrow />
          <Stat value={archived.length} label="documenti collegati" accent />
          <Stat value={machineCount} label="macchine" />
          {clienteCount > 0 && (
            <Stat value={clienteCount} label="clienti" />
          )}
          {reviewItems.length > 0 && (
            <Stat value={reviewItems.length} label="da verificare" warn />
          )}
        </div>
        {visibleFiles.length > 0 && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExtractParts()}
              disabled={extracting}
              className="inline-flex items-center gap-2 rounded-xl border border-brand/40 bg-brand-soft px-4 py-2 text-sm font-semibold text-brand transition-all hover:bg-brand/20 disabled:opacity-50"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 21h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {extracting ? "Estrazione…" : "Estrai ricambi"}
            </button>
            <button
              type="button"
              onClick={handleOrganize}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/20 transition-all hover:bg-brand-strong"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3v2m0 14v2m9-9h-2M5 12H3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.7" />
              </svg>
              Organizza con aestima
            </button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border bg-surface/30">
        <div className="flex shrink-0 gap-6 border-b border-border px-4">
          <TabBtn
            active={archiveTab === "organizzato"}
            onClick={() => setArchiveTab("organizzato")}
            label="Archivio organizzato"
          />
          <TabBtn
            active={archiveTab === "sorgente"}
            onClick={() => setArchiveTab("sorgente")}
            label="Sorgente"
            sub={`${visibleFiles.length} file`}
          />
          <TabBtn
            active={archiveTab === "verificare"}
            onClick={() => setArchiveTab("verificare")}
            label="Da verificare"
            badge={reviewItems.length}
            warn
          />
          <TabBtn
            active={archiveTab === "ricambi"}
            onClick={() => setArchiveTab("ricambi")}
            label="Archivio ricambi"
            sub={`${spareParts.length}`}
          />
        </div>

        <div className="min-h-[60vh] flex-1 p-3 lg:min-h-0">
          {archiveTab === "organizzato" ? (
            <OrganizedArchive
              docs={archived}
              query={query}
              onQueryChange={setQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onDeleteFile={deleteFile}
              onShowApiFile={showApi}
            />
          ) : archiveTab === "sorgente" ? (
            <SourceBrowser
              files={visibleFiles}
              compact
              onOrganize={handleOrganize}
              onDeleteFile={deleteFile}
              onShowApiFile={showApi}
              onUploadFiles={uploadFiles}
            />
          ) : archiveTab === "ricambi" ? (
            <PartsArchive
              parts={spareParts}
              onChange={setSpareParts}
              onPatch={handleSparePatch}
              extractProgress={extractProgress}
              query={query}
              onQueryChange={setQuery}
            />
          ) : (
            <ReviewQueue
              items={reviewItems}
              onResolve={onResolve}
              embedded
              onDeleteFile={deleteFile}
              onShowApiFile={showApi}
            />
          )}
        </div>
      </div>

      {apiFile && (
        <ArchiveApiModal file={apiFile} onClose={() => setApiFile(null)} />
      )}
      </div>

      <ArchiveGapsSidebar
        report={gapReport}
        onSearch={focusGap}
        onUpdateGap={handleUpdateGap}
      />
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  sub,
  badge,
  warn,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
  badge?: number;
  warn?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "relative flex items-center gap-1.5 py-3 text-sm font-medium transition-colors",
        active ? "text-ink" : "text-ink-faint hover:text-ink-muted",
      ].join(" ")}
    >
      {label}
      {sub && (
        <span className="text-[11px] font-normal text-ink-faint">· {sub}</span>
      )}
      {badge !== undefined && badge > 0 && (
        <span
          className={[
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            warn ? "bg-warn/15 text-warn" : "bg-surface-2 text-ink-muted",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
      )}
    </button>
  );
}

function Stat({
  value,
  label,
  accent,
  warn,
}: {
  value: number;
  label: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={[
          "text-lg font-bold tabular-nums",
          accent ? "text-brand" : warn ? "text-warn" : "text-ink",
        ].join(" ")}
      >
        {value}
      </span>
      <span className="text-xs text-ink-faint">{label}</span>
    </span>
  );
}

function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-ink-faint">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
