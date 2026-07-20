"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_BY_ID } from "@/lib/inboxData";
import { computeOffer, type Offer } from "@/lib/inboxOffers";
import { euro } from "@/lib/quote";
import type { PartRequest, RequestStatus } from "@/lib/inboxTypes";
import { useInbox } from "./InboxProvider";
import { LabelChip } from "./LabelChip";

// Vista PIPELINE — board Kanban delle offerte per stato.
// Trascina una card in un'altra colonna per cambiarne lo stato
// (lo stato è condiviso: cambia anche nell'inbox).

// Colonne della pipeline: le fasi dell'offerta (post-identificazione).
const PIPELINE_STAGES: RequestStatus[] = [
  "preventivo_pronto",
  "inviata",
  "attesa_fornitore",
  "vinta",
  "persa",
];

export function PipelineBoard() {
  const { requests, labels, changeStatus, setSelectedId } = useInbox();
  const router = useRouter();

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<RequestStatus | null>(null);

  // Offerta calcolata per ogni richiesta (deterministica, senza API).
  const offers = useMemo(() => {
    const map = new Map<string, Offer | null>();
    for (const r of requests) map.set(r.id, computeOffer(r));
    return map;
  }, [requests]);

  const inPipeline = requests.filter((r) => PIPELINE_STAGES.includes(r.status));

  const valueOf = (r: PartRequest) => offers.get(r.id)?.quote.total ?? 0;
  const sumValue = (list: PartRequest[]) =>
    list.reduce((acc, r) => acc + valueOf(r), 0);

  const openCard = (id: string) => {
    setSelectedId(id);
    router.push("/");
  };

  const handleDrop = (stage: RequestStatus) => {
    if (draggingId) changeStatus(draggingId, stage);
    setDraggingId(null);
    setDragOverStage(null);
  };

  const labelById = (id: string) => labels.find((l) => l.id === id);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Board */}
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div className="flex h-full min-w-max gap-3 p-5">
          {PIPELINE_STAGES.map((stage) => {
            const cfg = STATUS_BY_ID[stage];
            const cards = inPipeline.filter((r) => r.status === stage);
            const isOver = dragOverStage === stage;
            return (
              <div
                key={stage}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage);
                }}
                onDragLeave={() =>
                  setDragOverStage((s) => (s === stage ? null : s))
                }
                onDrop={() => handleDrop(stage)}
                className={[
                  "flex w-72 shrink-0 flex-col rounded-xl border bg-surface/40 transition-colors",
                  isOver ? "border-brand bg-brand-soft/40" : "border-border",
                ].join(" ")}
              >
                {/* Header colonna */}
                <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: cfg.color }}
                    />
                    <span className="text-sm font-semibold text-ink">
                      {cfg.label}
                    </span>
                    <span className="rounded-full bg-surface-2 px-1.5 text-[11px] font-semibold text-ink-faint">
                      {cards.length}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-ink-muted tabular-nums">
                    {euro(sumValue(cards))}
                  </span>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {cards.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-ink-faint">
                      Trascina qui un&apos;offerta
                    </p>
                  ) : (
                    cards.map((r) => {
                      const offer = offers.get(r.id);
                      return (
                        <article
                          key={r.id}
                          draggable
                          onDragStart={() => setDraggingId(r.id)}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverStage(null);
                          }}
                          onClick={() => openCard(r.id)}
                          className={[
                            "group cursor-grab rounded-lg border border-border bg-surface p-3 shadow-sm transition-all hover:border-border-strong active:cursor-grabbing",
                            draggingId === r.id ? "opacity-50" : "",
                          ].join(" ")}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                              {r.company}
                            </p>
                            {offer && (
                              <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                                {euro(offer.quote.total)}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-ink-muted">
                            {r.subject}
                          </p>
                          {offer && (
                            <p className="mt-1 font-mono text-[11px] text-brand">
                              {offer.component.code} · {offer.quote.number}
                            </p>
                          )}
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="truncate text-[11px] text-ink-faint">
                              {r.receivedLabel}
                            </span>
                            {r.labelIds.length > 0 && (
                              <div className="flex flex-wrap justify-end gap-1">
                                {r.labelIds.map((id) => {
                                  const l = labelById(id);
                                  return l ? <LabelChip key={id} label={l} /> : null;
                                })}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
