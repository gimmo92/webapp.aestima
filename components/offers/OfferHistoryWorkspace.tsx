"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  OUTCOME_LABELS,
  buildOfferHistory,
  type OfferOutcome,
} from "@/lib/offerHistory";
import { euro } from "@/lib/quote";
import { useInbox } from "@/components/inbox/InboxProvider";

type Filter = "tutte" | OfferOutcome;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "tutte", label: "Tutte" },
  { id: "accettata", label: "Accettate" },
  { id: "rifiutata", label: "Rifiutate" },
  { id: "in_attesa", label: "In attesa" },
];

export function OfferHistoryWorkspace() {
  const { requests, setSelectedId } = useInbox();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("tutte");
  const [query, setQuery] = useState("");

  const records = useMemo(() => buildOfferHistory(requests), [requests]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (filter !== "tutte" && r.outcome !== filter) return false;
      if (!q) return true;
      const hay = [
        r.quoteNumber,
        r.company,
        r.contact,
        r.componentTitle,
        r.componentCode,
        r.machine,
        r.serial,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [records, filter, query]);

  const accepted = records.filter((r) => r.outcome === "accettata");
  const rejected = records.filter((r) => r.outcome === "rifiutata");
  const pending = records.filter((r) => r.outcome === "in_attesa");
  const wonValue = accepted.reduce((acc, r) => acc + r.amount, 0);
  const conversion =
    accepted.length + rejected.length > 0
      ? Math.round((accepted.length / (accepted.length + rejected.length)) * 100)
      : 0;

  const openRequest = (requestId?: string) => {
    if (!requestId) return;
    setSelectedId(requestId);
    router.push("/");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 lg:grid-cols-4">
        <Kpi
          label="Offerte nello storico"
          value={String(records.length)}
          sub={`${accepted.length} accettate · ${rejected.length} rifiutate`}
          color="#6366f1"
        />
        <Kpi
          label="Valore accettato"
          value={euro(wonValue)}
          sub={`${accepted.length} ordini confermati`}
          color="#22c55e"
        />
        <Kpi
          label="In attesa risposta"
          value={String(pending.length)}
          sub={euro(pending.reduce((a, r) => a + r.amount, 0))}
          color="#3b82f6"
        />
        <Kpi
          label="Tasso accettazione"
          value={`${conversion}%`}
          sub="su offerte concluse"
          color="#a855f7"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  filter === f.id
                    ? "border-brand/50 bg-brand-soft text-ink"
                    : "border-border bg-surface text-ink-muted hover:border-border-strong",
                ].join(" ")}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:max-w-xs">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            >
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca cliente, codice, n. offerta…"
              className="w-full rounded-lg border border-border bg-base py-2 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-ink-faint">
                  <th className="px-4 py-3 font-semibold">Inviata</th>
                  <th className="px-4 py-3 font-semibold">N. offerta</th>
                  <th className="px-4 py-3 font-semibold">Cliente</th>
                  <th className="px-4 py-3 font-semibold">Componente</th>
                  <th className="px-4 py-3 font-semibold">Macchina</th>
                  <th className="px-4 py-3 text-right font-semibold">Importo</th>
                  <th className="px-4 py-3 font-semibold">Esito</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-ink-faint">
                      Nessuna offerta corrisponde ai filtri.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const outcome = OUTCOME_LABELS[r.outcome];
                    return (
                      <tr
                        key={r.id}
                        onClick={() => openRequest(r.requestId)}
                        className={[
                          "border-b border-border/60 transition-colors",
                          r.requestId
                            ? "cursor-pointer hover:bg-surface-2/40"
                            : "",
                        ].join(" ")}
                      >
                        <td className="px-4 py-3 align-top text-ink-muted">
                          <p>{r.sentDate}</p>
                          {r.closedDate && (
                            <p className="text-[11px] text-ink-faint">
                              Chiusa {r.closedDate}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs text-brand">
                          {r.quoteNumber}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-ink">{r.company}</p>
                          <p className="text-xs text-ink-faint">{r.contact}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="line-clamp-2 text-ink">{r.componentTitle}</p>
                          <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                            {r.componentCode}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-ink-muted">
                          {r.machine}
                          <span className="block font-mono text-[11px] text-ink-faint">
                            {r.serial}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right font-semibold tabular-nums text-ink">
                          {euro(r.amount)}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              color: outcome.color,
                              backgroundColor: `${outcome.color}18`,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: outcome.color }}
                            />
                            {outcome.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-ink-faint">
          Le righe collegate a una richiesta inbox sono cliccabili per aprire il
          dettaglio in Inbox.
        </p>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface/60 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </p>
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-ink">{value}</p>
      <p className="text-xs text-ink-faint">{sub}</p>
    </div>
  );
}
