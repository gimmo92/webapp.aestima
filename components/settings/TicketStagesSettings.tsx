"use client";

import { useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  DEFAULT_TICKET_STAGES,
  TICKET_STAGE_COLORS,
  newTicketStageId,
} from "@/lib/ticketData";
import type { TicketStage } from "@/lib/ticketTypes";

export function TicketStagesSettings() {
  const { ticketStages, setTicketStages, tickets } = useInbox();
  const [draftLabel, setDraftLabel] = useState("");

  const move = (index: number, dir: -1 | 1) => {
    const next = [...ticketStages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTicketStages(next);
  };

  const patch = (index: number, part: Partial<TicketStage>) => {
    setTicketStages(
      ticketStages.map((s, i) => (i === index ? { ...s, ...part } : s))
    );
  };

  const remove = (index: number) => {
    const stage = ticketStages[index];
    if (ticketStages.length <= 1) return;
    const used = tickets.some((t) => t.status === stage.id);
    if (used) {
      window.alert(
        "Questo stage è usato da ticket esistenti. Spostali prima di eliminarlo."
      );
      return;
    }
    setTicketStages(ticketStages.filter((_, i) => i !== index));
  };

  const addStage = () => {
    const label = draftLabel.trim() || "Nuovo stage";
    let id = newTicketStageId(label);
    if (ticketStages.some((s) => s.id === id)) {
      id = `${id}_${Date.now().toString(36)}`;
    }
    setTicketStages([
      ...ticketStages,
      {
        id,
        label,
        color: TICKET_STAGE_COLORS[ticketStages.length % TICKET_STAGE_COLORS.length],
        inBoard: true,
        terminal: false,
      },
    ]);
    setDraftLabel("");
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-bold text-ink">Stage ticket</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Questi stage guidano la Coda ticket (colonne drag & drop) e i pulsanti
          di avanzamento in lista. L&apos;ordine qui è l&apos;ordine delle
          colonne.
        </p>

        <div className="mt-6 space-y-2">
          {ticketStages.map((stage, index) => (
            <div
              key={stage.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-surface/60 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                  aria-label="Sposta su"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === ticketStages.length - 1}
                  className="rounded-lg border border-border px-2 py-1 text-xs text-ink-muted hover:text-ink disabled:opacity-30"
                  aria-label="Sposta giù"
                >
                  ↓
                </button>
              </div>
              <input
                value={stage.label}
                onChange={(e) => patch(index, { label: e.target.value })}
                className="min-w-0 flex-1 rounded-lg border border-border bg-base px-3 py-2 text-sm text-ink outline-none focus:border-brand"
              />
              <div className="flex flex-wrap items-center gap-2">
                {TICKET_STAGE_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => patch(index, { color })}
                    className={[
                      "h-6 w-6 rounded-full border-2",
                      stage.color === color
                        ? "border-ink"
                        : "border-transparent",
                    ].join(" ")}
                    style={{ backgroundColor: color }}
                    aria-label={`Colore ${color}`}
                  />
                ))}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={stage.inBoard}
                  onChange={(e) => patch(index, { inBoard: e.target.checked })}
                />
                In coda
              </label>
              <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={stage.terminal}
                  onChange={(e) => patch(index, { terminal: e.target.checked })}
                />
                Chiuso
              </label>
              <button
                type="button"
                onClick={() => remove(index)}
                className="text-xs font-medium text-danger hover:underline"
              >
                Elimina
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStage();
              }
            }}
            placeholder="Nome nuovo stage"
            className="min-w-0 flex-1 rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={addStage}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            Aggiungi stage
          </button>
          <button
            type="button"
            onClick={() => setTicketStages(DEFAULT_TICKET_STAGES)}
            className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-ink-muted hover:text-ink"
          >
            Ripristina default
          </button>
        </div>
      </div>
    </div>
  );
}
