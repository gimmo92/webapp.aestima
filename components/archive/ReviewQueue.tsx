"use client";

import { useState } from "react";
import { DOC_TYPES, KNOWN_MACHINES, machineLabel } from "@/lib/archiveData";
import type { SourceFile } from "@/lib/archiveTypes";
import { FileIcon } from "./FileIcon";
import { ConfidenceBadge } from "./ConfidenceBadge";

// CODA DI REVISIONE (human-in-the-loop) — file a bassa confidenza dove
// l'agente propone ma l'operatore conferma o corregge.

interface Props {
  items: SourceFile[];
  onResolve: (fileId: string, serial: string) => void;
}

export function ReviewQueue({ items, onResolve }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-warn/40 bg-warn/5 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-warn/15 text-warn">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v5m0 3h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <h3 className="text-sm font-semibold text-ink">Da verificare</h3>
          <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-semibold text-warn">
            {items.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((f) => (
          <ReviewItem key={f.id} file={f} onResolve={onResolve} />
        ))}
      </div>

      <p className="mt-3 border-t border-warn/20 pt-2.5 text-xs text-ink-muted">
        <span className="font-semibold text-ink">aestima propone, l&apos;operatore conferma</span>{" "}
        i casi dubbi — e il sistema impara.
      </p>
    </section>
  );
}

function ReviewItem({
  file,
  onResolve,
}: {
  file: SourceFile;
  onResolve: (fileId: string, serial: string) => void;
}) {
  const suggested = file.classification.macchinaSerial;
  const suggestedKnown = KNOWN_MACHINES.some((m) => m.serial === suggested);
  const [correcting, setCorrecting] = useState(false);
  const [selected, setSelected] = useState<string>(
    file.correctSerial ?? KNOWN_MACHINES[0]?.serial ?? ""
  );

  const tipoLabel = DOC_TYPES[file.classification.tipo].label.toLowerCase();

  return (
    <div className="rounded-xl border border-border bg-base/60 p-3">
      <div className="flex items-start gap-3">
        <FileIcon ext={file.ext} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-ink">{file.name}</p>
            <ConfidenceBadge confidence={file.classification.confidence} showLabel />
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            {suggested ? (
              <>
                Questo {tipoLabel} sembra appartenere a{" "}
                <span className="font-medium text-ink">
                  {machineLabel(suggested)}
                </span>
                {!suggestedKnown && (
                  <span className="text-warn"> (matricola non trovata)</span>
                )}
                , confermi?
              </>
            ) : (
              <>Non sono riuscito a collegare questo {tipoLabel} a una macchina con certezza.</>
            )}
          </p>

          {/* Correzione: scelta macchina */}
          {correcting ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="rounded-lg border border-border bg-base px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand"
              >
                {KNOWN_MACHINES.map((m) => (
                  <option key={m.serial} value={m.serial}>
                    {m.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => onResolve(file.id, selected)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong"
              >
                Assegna e archivia
              </button>
              <button
                onClick={() => setCorrecting(false)}
                className="rounded-lg px-2 py-1.5 text-sm text-ink-faint transition-colors hover:text-ink"
              >
                Annulla
              </button>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {suggested && suggestedKnown && (
                <button
                  onClick={() => onResolve(file.id, suggested)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ok px-3 py-1.5 text-sm font-semibold text-white transition-all hover:brightness-110"
                >
                  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Conferma
                </button>
              )}
              <button
                onClick={() => setCorrecting(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
                Correggi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
