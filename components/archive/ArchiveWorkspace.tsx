"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { REVIEW_THRESHOLD, SOURCE_FILES } from "@/lib/archiveData";
import type { ArchivedDoc, ClassifyResult, SourceFile } from "@/lib/archiveTypes";
import { SourceBrowser } from "./SourceBrowser";
import { ProcessingPipeline } from "./ProcessingPipeline";
import { OrganizedArchive, type ArchiveViewMode } from "./OrganizedArchive";
import { ReviewQueue } from "./ReviewQueue";

// Orchestratore della tab Archivio: gestisce le fasi
// sorgente → elaborazione → archivio organizzato.
//
// Stato solo in memoria (React state). In PRODUZIONE l'agente si
// collegherebbe a una cartella cloud reale (Drive/SharePoint/Dropbox)
// e persisterebbe l'archivio su un database.

type Phase = "source" | "processing" | "done";
type ArchiveTab = "organizzato" | "sorgente";

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
      const list: ClassifyResult[] = data?.results ?? SOURCE_FILES.map(fallbackResult);
      setResults(new Map(list.map((r) => [r.id, r])));
      setApiSource(data?.source === "anthropic" ? "anthropic" : "mock");
    } catch {
      setResults(new Map(SOURCE_FILES.map((f) => [f.id, fallbackResult(f)])));
      setApiSource("mock");
    } finally {
      setApiDone(true);
    }
  }, []);

  const resultFor = useCallback(
    (f: SourceFile): ClassifyResult => results.get(f.id) ?? fallbackResult(f),
    [results]
  );

  // Costruisce archivio + coda di revisione dai risultati.
  const { archived, reviewItems } = useMemo(() => {
    const archived: ArchivedDoc[] = [];
    const reviewItems: SourceFile[] = [];

    for (const f of SOURCE_FILES) {
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
  }, [resultFor, resolved]);

  const machineCount = useMemo(
    () => new Set(archived.map((d) => d.macchinaSerial)).size,
    [archived]
  );

  const restart = () => {
    setPhase("source");
    setApiDone(false);
    setResults(new Map());
    setResolved({});
    setQuery("");
  };

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
          <SourceBrowser files={SOURCE_FILES} onOrganize={handleOrganize} />
        </div>
      </div>
    );
  }

  // --- Fase ELABORAZIONE ---
  if (phase === "processing") {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ProcessingPipeline
          files={SOURCE_FILES}
          apiDone={apiDone}
          onComplete={() => setPhase("done")}
          source={apiSource}
        />
      </div>
    );
  }

  // --- Fase ARCHIVIO ORGANIZZATO ---
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
      {/* Riepilogo + azioni */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          <Stat value={SOURCE_FILES.length} label="file sorgente" />
          <Arrow />
          <Stat value={archived.length} label="documenti collegati" accent />
          <Stat value={machineCount} label="macchine" />
          {reviewItems.length > 0 && (
            <Stat value={reviewItems.length} label="da verificare" warn />
          )}
          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              apiSource === "anthropic"
                ? "bg-brand/15 text-brand"
                : "border border-border bg-surface-2 text-ink-muted",
            ].join(" ")}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {apiSource === "anthropic" ? "Classificato con Claude" : "Demo locale"}
          </span>
        </div>
        <button
          onClick={restart}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Ricomincia demo
        </button>
      </div>

      {/* Tab: Archivio organizzato | Sorgente */}
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
            sub={`${SOURCE_FILES.length} file disordinati`}
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
            />
          ) : (
            <SourceBrowser files={SOURCE_FILES} compact />
          )}
        </div>
      </div>

      {/* Coda di revisione (in fondo) */}
      {reviewItems.length > 0 && (
        <ReviewQueue items={reviewItems} onResolve={onResolve} />
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "relative py-3 text-sm font-medium transition-colors",
        active ? "text-ink" : "text-ink-faint hover:text-ink-muted",
      ].join(" ")}
    >
      {label}
      {sub && (
        <span className="ml-1.5 text-[11px] font-normal text-ink-faint">· {sub}</span>
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
