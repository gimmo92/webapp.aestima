"use client";

import { useEffect, useState } from "react";
import type { SourceFile } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";
import { DocTypeBadge } from "./DocTypeBadge";

// ELABORAZIONE — pipeline dell'agente a 4 stadi + rivelazione progressiva
// del tipo riconosciuto per ciascun file (da "da classificare" a "organizzato").

const STAGES = [
  { label: "Classificazione", hint: "Riconosco il tipo di documento" },
  { label: "Estrazione metadati", hint: "Estraggo codici, macchina, revisione" },
  { label: "Collegamento", hint: "Collego disegni, distinte, macchine, offerte" },
  { label: "Indicizzazione", hint: "Costruisco l'archivio interrogabile" },
];

const TOTAL_TICKS = 24;
const TICK_MS = 200;

interface Props {
  files: SourceFile[];
  apiDone: boolean;
  onComplete: () => void;
  source?: "anthropic" | "mock";
}

export function ProcessingPipeline({ files, apiDone, onComplete, source }: Props) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (tick >= TOTAL_TICKS) return;
    const t = setTimeout(() => setTick((v) => v + 1), TICK_MS);
    return () => clearTimeout(t);
  }, [tick]);

  useEffect(() => {
    if (tick >= TOTAL_TICKS && apiDone) {
      const t = setTimeout(onComplete, 500);
      return () => clearTimeout(t);
    }
  }, [tick, apiDone, onComplete]);

  const stage = Math.min(Math.floor(tick / (TOTAL_TICKS / STAGES.length)), STAGES.length - 1);
  const revealed = Math.min(
    Math.floor((tick / TOTAL_TICKS) * files.length),
    files.length
  );

  return (
    <section className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 py-8">
      {/* Nucleo agente */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-brand/30 [animation:pulse-ring_1.8s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-brand/20 [animation:pulse-ring_1.8s_ease-out_infinite_0.6s]" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-brand/50 bg-brand-soft">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand" aria-hidden="true">
            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M9 13l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl font-bold text-ink">aestima sta organizzando l&apos;archivio…</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {source === "anthropic"
          ? "Classificazione in corso con Claude (Anthropic)"
          : "Classificazione documentale automatica"}
        {" · "}
        <span className="tabular-nums text-ink">
          {revealed}/{files.length}
        </span>{" "}
        file
      </p>

      {/* Stadi */}
      <ul className="mt-6 w-full max-w-md space-y-2">
        {STAGES.map((s, i) => {
          const done = i < stage;
          const current = i === stage;
          return (
            <li
              key={s.label}
              className={[
                "flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-all",
                done
                  ? "border-border bg-surface-2/50"
                  : current
                    ? "border-brand/50 bg-brand-soft"
                    : "border-transparent opacity-40",
              ].join(" ")}
            >
              {done ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand/20 text-brand">
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : current ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-ink-faint" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${current ? "text-ink" : "text-ink-muted"}`}>
                  {s.label}
                </p>
                <p className="truncate text-[11px] text-ink-faint">{s.hint}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {/* File in classificazione */}
      <div className="mt-6 grid w-full grid-cols-1 gap-1.5 sm:grid-cols-2">
        {files.map((f, i) => {
          const isRevealed = i < revealed;
          return (
            <div
              key={f.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface/50 px-2.5 py-1.5"
            >
              <FileIcon ext={f.ext} />
              <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                {f.name}
              </span>
              {isRevealed ? (
                <DocTypeBadge tipo={f.classification.tipo} />
              ) : (
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-brand/20 border-t-brand/70" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
