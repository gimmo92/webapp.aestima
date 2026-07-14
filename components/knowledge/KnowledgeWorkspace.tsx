"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  PROBLEM_CATEGORY_LABELS,
  RECURRING_FREQUENCY_THRESHOLD,
} from "@/lib/knowledgeData";
import type { KnowledgeEntry, ProblemCategory } from "@/lib/knowledgeTypes";

export function KnowledgeWorkspace() {
  const {
    knowledgeBase,
    consolidateKnowledgeEntries,
    findSimilarKnowledgeEntries,
  } = useInbox();
  const [query, setQuery] = useState("");
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [consolidating, setConsolidating] = useState(false);
  const [consolidateMsg, setConsolidateMsg] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const highlightEntry = searchParams.get("entry");
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!highlightEntry) return;
    const entry = knowledgeBase.find((e) => e.id === highlightEntry);
    if (entry) setMachineFilter(entry.machineModel);
    const t = window.setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
    return () => window.clearTimeout(t);
  }, [highlightEntry, knowledgeBase]);

  const machines = useMemo(() => {
    const set = new Set(knowledgeBase.map((e) => e.machineModel));
    return [...set].sort();
  }, [knowledgeBase]);

  const machineCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const e of knowledgeBase) {
      counts[e.machineModel] = (counts[e.machineModel] ?? 0) + 1;
    }
    return counts;
  }, [knowledgeBase]);

  const recurring = useMemo(
    () =>
      [...knowledgeBase]
        .filter(
          (e) =>
            e.frequency >= RECURRING_FREQUENCY_THRESHOLD &&
            (machineFilter === "all" || e.machineModel === machineFilter)
        )
        .sort((a, b) => b.frequency - a.frequency),
    [knowledgeBase, machineFilter]
  );

  const filtered = useMemo(() => {
    let list = knowledgeBase;
    if (machineFilter !== "all") {
      list = list.filter((e) => e.machineModel === machineFilter);
    }
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => {
      const haystack = [
        e.machineModel,
        e.machineSerial ?? "",
        e.symptom,
        e.probableCause,
        e.solution,
        ...e.tags,
        ...e.spareParts.map((p) => `${p.code} ${p.description}`),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [knowledgeBase, query, machineFilter]);

  const grouped = useMemo(() => {
    const byMachine = new Map<string, KnowledgeEntry[]>();
    for (const e of filtered) {
      const key = e.machineModel;
      const list = byMachine.get(key) ?? [];
      list.push(e);
      byMachine.set(key, list);
    }
    return [...byMachine.entries()].map(([machine, entries]) => {
      const byCategory = new Map<ProblemCategory, KnowledgeEntry[]>();
      for (const e of entries.sort((a, b) => b.frequency - a.frequency)) {
        const cat = e.problemCategory;
        const list = byCategory.get(cat) ?? [];
        list.push(e);
        byCategory.set(cat, list);
      }
      return { machine, categories: [...byCategory.entries()] };
    });
  }, [filtered]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleConsolidate = async () => {
    const ids = [...selectedIds];
    if (ids.length < 2) return;
    const entries = knowledgeBase.filter((e) => ids.includes(e.id));
    if (entries.length < 2) return;

    setConsolidating(true);
    setConsolidateMsg(null);
    try {
      const res = await fetch("/api/knowledge-consolidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      const merged = data.entry ?? data.fallback;
      if (!merged) {
        setConsolidateMsg("Consolidazione non riuscita.");
        return;
      }
      const newId = consolidateKnowledgeEntries(ids, {
        machineModel: merged.machineModel,
        machineSerial: merged.machineSerial,
        problemCategory: merged.problemCategory ?? entries[0].problemCategory,
        symptom: merged.symptom,
        probableCause: merged.probableCause,
        solution: merged.solution,
        spareParts: merged.spareParts ?? [],
        frequency: merged.frequency ?? entries.reduce((s, e) => s + e.frequency, 0),
        tags: merged.tags ?? [],
      });
      setSelectedIds(new Set());
      setConsolidateMsg(
        `Voci fuse in scheda autorevole ${newId} (${data.source === "anthropic" ? "AI" : "locale"}).`
      );
    } catch {
      setConsolidateMsg("Errore di rete durante la consolidazione.");
    } finally {
      setConsolidating(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-surface/40 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">Manuale troubleshooting</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Knowledge base appresa dagli interventi chiusi ·{" "}
              {knowledgeBase.length} voci
            </p>
            <p className="mt-1 text-xs text-ink-faint">
              In produzione: persistenza su DB, indicizzazione semantica e
              alimentazione automatica dallo storico CMMS.
            </p>
          </div>
          {selectedIds.size >= 2 && (
            <button
              onClick={() => void handleConsolidate()}
              disabled={consolidating}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/20 hover:bg-brand-strong disabled:opacity-50"
            >
              {consolidating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              Consolida ({selectedIds.size} voci)
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          <div className="relative min-w-0 flex-1 max-w-xl">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="m20 20-3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca sintomo, codice ricambio…"
              className="w-full rounded-lg border border-border bg-base py-2.5 pl-9 pr-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Macchina
            </p>
            <div className="flex flex-wrap gap-1.5">
              <MachineFilterChip
                active={machineFilter === "all"}
                onClick={() => setMachineFilter("all")}
                label="Tutte"
                count={knowledgeBase.length}
              />
              {machines.map((m) => (
                <MachineFilterChip
                  key={m}
                  active={machineFilter === m}
                  onClick={() => setMachineFilter(m)}
                  label={m}
                  count={machineCounts[m] ?? 0}
                />
              ))}
            </div>
          </div>
        </div>

        {consolidateMsg && (
          <p className="mt-3 text-sm text-brand">{consolidateMsg}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {recurring.length > 0 && !query && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warn">
                Ricorrenti
              </span>
              Problemi più frequenti
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recurring.map((e) => (
                <div
                  key={`rec-${e.id}`}
                  ref={e.id === highlightEntry ? highlightRef : undefined}
                >
                  <KnowledgeEntryCard
                    entry={e}
                    highlighted={e.id === highlightEntry}
                    selected={selectedIds.has(e.id)}
                    onToggleSelect={() => toggleSelect(e.id)}
                    similarCount={
                      findSimilarKnowledgeEntries(e.machineModel, e.symptom)
                        .length
                    }
                    compact
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {grouped.length === 0 ? (
          <div className="py-16 text-center text-sm text-ink-faint">
            Nessuna voce corrisponde alla ricerca.
          </div>
        ) : (
          grouped.map(({ machine, categories }) => (
            <section key={machine} className="mb-10">
              <h2 className="mb-4 border-b border-border pb-2 text-lg font-bold text-ink">
                {machine}
              </h2>
              {categories.map(([category, entries]) => (
                <div key={category} className="mb-6">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    {PROBLEM_CATEGORY_LABELS[category]}
                  </h3>
                  <div className="space-y-3">
                    {entries.map((e) => (
                      <div
                        key={e.id}
                        ref={e.id === highlightEntry ? highlightRef : undefined}
                      >
                        <KnowledgeEntryCard
                          entry={e}
                          highlighted={e.id === highlightEntry}
                          selected={selectedIds.has(e.id)}
                          onToggleSelect={() => toggleSelect(e.id)}
                          similarCount={
                            findSimilarKnowledgeEntries(e.machineModel, e.symptom)
                              .length
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function KnowledgeEntryCard({
  entry,
  highlighted = false,
  selected,
  onToggleSelect,
  similarCount,
  compact = false,
}: {
  entry: KnowledgeEntry;
  highlighted?: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  similarCount: number;
  compact?: boolean;
}) {
  const isRecurring = entry.frequency >= RECURRING_FREQUENCY_THRESHOLD;

  return (
    <article
      id={`kb-entry-${entry.id}`}
      className={[
        "rounded-xl border bg-base/60 transition-colors",
        highlighted
          ? "border-brand ring-2 ring-brand/30"
          : selected
            ? "border-brand bg-brand-soft/30"
            : "border-border",
        compact ? "p-3" : "p-4",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1 h-4 w-4 rounded border-border text-brand focus:ring-brand/30"
          title="Seleziona per consolidare"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-brand">
              {entry.id}
            </span>
            {isRecurring && (
              <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10px] font-bold uppercase text-warn">
                Ricorrente · {entry.frequency}×
              </span>
            )}
            {!isRecurring && entry.frequency > 1 && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-ink-faint">
                {entry.frequency} occorrenze
              </span>
            )}
            {entry.consolidated && (
              <span className="rounded-full bg-ok/10 px-2 py-0.5 text-[10px] font-semibold text-ok">
                Consolidata
              </span>
            )}
            {entry.sourceTicketId && (
              <span className="text-[10px] text-ink-faint">
                da ticket {entry.sourceTicketId}
              </span>
            )}
          </div>

          {entry.machineSerial && (
            <p className="mt-0.5 text-xs text-ink-faint">
              Matricola {entry.machineSerial}
            </p>
          )}

          <h4 className="mt-2 text-sm font-semibold text-ink">{entry.symptom}</h4>

          {!compact && (
            <>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Field label="Causa probabile" value={entry.probableCause} />
                <Field label="Soluzione" value={entry.solution} />
              </div>
              {entry.spareParts.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                    Ricambi coinvolti
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.spareParts.map((p) => (
                      <span
                        key={p.code}
                        className="rounded-lg border border-border bg-surface px-2 py-1 font-mono text-[11px] text-ink-muted"
                      >
                        {p.code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {entry.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {entry.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-ink-faint"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}

          {compact && (
            <p className="mt-1 line-clamp-2 text-xs text-ink-faint">
              {entry.solution}
            </p>
          )}

          {similarCount > 1 && !entry.consolidated && (
            <p className="mt-2 text-[11px] text-brand">
              {similarCount} voci simili — seleziona e usa Consolida
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

function MachineFilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-brand/50 bg-brand-soft text-ink"
          : "border-border bg-base text-ink-muted hover:border-border-strong hover:text-ink",
      ].join(" ")}
    >
      <span className="truncate">{label}</span>
      <span
        className={[
          "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
          active ? "bg-brand/20 text-brand" : "bg-surface-2 text-ink-faint",
        ].join(" ")}
      >
        {count}
      </span>
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">{value}</p>
    </div>
  );
}
