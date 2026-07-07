"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { REVIEW_THRESHOLD, SOURCE_FILES } from "@/lib/archiveData";
import type { ArchivedDoc, ClassifyResult, SourceFile } from "@/lib/archiveTypes";
import { filesToSourceFiles, revokeSourceFileUrl } from "@/lib/uploadSourceFile";
import { computeArchiveGaps } from "@/lib/archiveGaps";
import { SourceBrowser } from "./SourceBrowser";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { OrganizedArchive, type ArchiveViewMode } from "./OrganizedArchive";
import { ReviewQueue } from "./ReviewQueue";
import { ArchiveApiModal } from "./ArchiveApiModal";
import { ArchiveGapsSidebar } from "./ArchiveGapsSidebar";

// Orchestratore della tab Archivio: gestisce le fasi
// sorgente → elaborazione → archivio organizzato.
//
// Stato solo in memoria (React state). In PRODUZIONE l'agente si
// collegherebbe a una cartella cloud reale (Drive/SharePoint/Dropbox)
// e persisterebbe l'archivio su un database.

type Phase = "source" | "processing" | "done";
type ArchiveTab = "organizzato" | "sorgente" | "verificare";

/** Classificazione di fallback a partire dal ground truth mock del file. */
function fallbackResult(f: SourceFile): ClassifyResult {
  const c = f.classification;
  return {
    id: f.id,
    tipo: c.tipo,
    macchinaSerial: c.macchinaSerial,
    codice: c.codice,
    revisione: c.revisione,
    data: c.data,
    confidence: c.confidence,
    source: "mock",
  };
}

export function ArchiveWorkspace() {
  const searchParams = useSearchParams();
  // L'archivio parte già dal risultato organizzato (vista "dopo"):
  // classificazione mock precalcolata dal ground truth dei file.
  // "Ricomincia" riporta alla fase sorgente per mostrare l'elaborazione.
  const [phase, setPhase] = useState<Phase>("done");
  const [apiDone, setApiDone] = useState(true);
  const [results, setResults] = useState<Map<string, ClassifyResult>>(new Map());
  const [apiSource, setApiSource] = useState<"anthropic" | "mock">("mock");
  // Ricerca inizializzata dal parametro ?q= (link interni dall'inbox).
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [archiveTab, setArchiveTab] = useState<ArchiveTab>("organizzato");
  const [viewMode, setViewMode] = useState<ArchiveViewMode>("macchina");
  // Risoluzioni della coda di revisione: fileId → matricola assegnata.
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set());
  const [uploadedFiles, setUploadedFiles] = useState<SourceFile[]>([]);
  const [apiFile, setApiFile] = useState<SourceFile | null>(null);

  const visibleFiles = useMemo(
    () => [
      ...SOURCE_FILES.filter((f) => !deletedIds.has(f.id)),
      ...uploadedFiles.filter((f) => !deletedIds.has(f.id)),
    ],
    [deletedIds, uploadedFiles]
  );

  const uploadFiles = useCallback((files: File[]) => {
    const added = filesToSourceFiles(files);
    if (added.length === 0) return;
    setUploadedFiles((prev) => [...prev, ...added]);
  }, []);

  const deleteFile = useCallback((fileId: string) => {
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
    setResults((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  const handleOrganize = useCallback(async () => {
    setPhase("processing");
    setApiDone(false);
    setResolved({});

    try {
      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = res.ok ? await res.json() : null;
      const list: ClassifyResult[] = data?.results ?? visibleFiles.map(fallbackResult);
      setResults(new Map(list.map((r) => [r.id, r])));
      setApiSource(data?.source === "anthropic" ? "anthropic" : "mock");
    } catch {
      setResults(new Map(visibleFiles.map((f) => [f.id, fallbackResult(f)])));
      setApiSource("mock");
    } finally {
      setApiDone(true);
    }
  }, [visibleFiles]);

  const resultFor = useCallback(
    (f: SourceFile): ClassifyResult => results.get(f.id) ?? fallbackResult(f),
    [results]
  );

  // Costruisce archivio + coda di revisione dai risultati.
  const { archived, reviewItems } = useMemo(() => {
    const archived: ArchivedDoc[] = [];
    const reviewItems: SourceFile[] = [];

    for (const f of visibleFiles) {
      const r = resultFor(f);
      const toDoc = (serial: string, confidence: number): ArchivedDoc => ({
        file: f,
        tipo: r.tipo,
        macchinaSerial: serial,
        codice: r.codice,
        revisione: r.revisione,
        data: r.data,
        confidence,
        source: r.source,
      });

      if (r.confidence >= REVIEW_THRESHOLD && r.macchinaSerial) {
        archived.push(toDoc(r.macchinaSerial, r.confidence));
      } else if (resolved[f.id]) {
        // Confermato/corretto dall'operatore → confidenza piena.
        archived.push(toDoc(resolved[f.id], 1));
      } else {
        reviewItems.push(f);
      }
    }
    return { archived, reviewItems };
  }, [resultFor, resolved, visibleFiles]);

  const showApi = useCallback((file: SourceFile) => setApiFile(file), []);

  const machineCount = useMemo(
    () => new Set(archived.map((d) => d.macchinaSerial)).size,
    [archived]
  );

  const gapReport = useMemo(
    () => computeArchiveGaps(archived, visibleFiles),
    [archived, visibleFiles]
  );

  const focusGap = useCallback((q: string) => {
    setArchiveTab("organizzato");
    setQuery(q);
  }, []);

  const onResolve = (fileId: string, serial: string) => {
    setResolved((prev) => ({ ...prev, [fileId]: serial }));
  };

  // --- Fase SORGENTE ---
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

  // --- Fase ELABORAZIONE ---
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

  // --- Fase ARCHIVIO ORGANIZZATO ---
  return (
    <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4 lg:flex-row">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto">
      {/* Riepilogo + azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <Stat value={visibleFiles.length} label="file sorgente" />
          <Arrow />
          <Stat value={archived.length} label="documenti collegati" accent />
          <Stat value={machineCount} label="macchine" />
          {reviewItems.length > 0 && (
            <Stat value={reviewItems.length} label="da verificare" warn />
          )}
        </div>
      </div>

      {/* Tab: Archivio organizzato | Sorgente | Da verificare */}
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
            sub={`${visibleFiles.length} file disordinati`}
          />
          <TabBtn
            active={archiveTab === "verificare"}
            onClick={() => setArchiveTab("verificare")}
            label="Da verificare"
            badge={reviewItems.length}
            warn
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
              onDeleteFile={deleteFile}
              onShowApiFile={showApi}
              onUploadFiles={uploadFiles}
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

      <ArchiveGapsSidebar report={gapReport} onSearch={focusGap} />
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
