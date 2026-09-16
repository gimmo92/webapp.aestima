"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildFeedbackInsights, type ThemeInsight } from "@/lib/feedbackInsights";
import type { CustomerSentiment } from "@/lib/interventionReportDraft";
import {
  listReports,
  subscribeReports,
  type InterventionReportRecord,
} from "@/lib/reportsStore";
import { SENTIMENT_BY_ID, SentimentPill } from "./SentimentPill";

type SentimentFilter = "all" | CustomerSentiment;

const FILTERS: { id: SentimentFilter; label: string }[] = [
  { id: "all", label: "Tutti" },
  { id: "critico", label: "Critici" },
  { id: "neutro", label: "Neutri" },
  { id: "positivo", label: "Soddisfatti" },
];

export function FeedbackWorkspace() {
  const [reports, setReports] = useState<InterventionReportRecord[]>([]);
  const [filter, setFilter] = useState<SentimentFilter>("all");
  const [themeId, setThemeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const sync = () => setReports(listReports());
    sync();
    return subscribeReports(sync);
  }, []);

  const insights = useMemo(() => buildFeedbackInsights(reports), [reports]);

  const visibleEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return insights.entries.filter((entry) => {
      if (filter !== "all" && entry.sentiment !== filter) return false;
      if (themeId && !entry.themeIds.includes(themeId)) return false;
      if (!q) return true;
      return [
        entry.feedback,
        entry.requests.join(" "),
        entry.report.technicianName,
        entry.report.customerCompany ?? "",
        entry.report.machineModel,
        entry.report.reportNumber,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [filter, insights.entries, query, themeId]);

  const { totals, themes } = insights;
  const maxThemeCount = themes[0]?.count ?? 1;
  const activeTheme = themes.find((item) => item.theme.id === themeId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-surface/40">
      <div className="mx-auto max-w-5xl px-8 py-6">
        <header>
          <h1 className="text-xl font-bold text-ink">Feedback dei clienti</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Riscontri raccolti sui rapporti d&apos;intervento, con il sentiment
            e i temi che i clienti chiedono più spesso.
          </p>
        </header>

        {totals.withFeedback === 0 ? (
          <div className="mt-8 rounded-xl border border-border bg-base px-6 py-10 text-center">
            <p className="text-sm text-ink-muted">
              Nessun feedback raccolto. Compila un rapporto da una chat
              WhatsApp e riporta cosa ha detto il cliente.
            </p>
            <Link
              href="/whatsapp"
              className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Vai alle chat WhatsApp
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                label="Rapporti con feedback"
                value={`${totals.withFeedback}/${totals.reports}`}
                hint="Interventi con la voce del cliente"
              />
              <StatCard
                label="Clienti critici"
                value={String(totals.critico)}
                hint={`${percent(totals.critico, totals.withFeedback)} dei feedback`}
                color={SENTIMENT_BY_ID.critico.color}
              />
              <StatCard
                label="Clienti soddisfatti"
                value={String(totals.positivo)}
                hint={`${percent(totals.positivo, totals.withFeedback)} dei feedback`}
                color={SENTIMENT_BY_ID.positivo.color}
              />
              <StatCard
                label="Richieste aperte"
                value={String(totals.requests)}
                hint="Da girare alle vendite"
              />
            </div>

            <section className="mt-5 rounded-xl border border-border bg-base px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">
                Sentiment complessivo
              </h2>
              <SentimentBar
                positivo={totals.positivo}
                neutro={totals.neutro}
                critico={totals.critico}
              />
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {(["positivo", "neutro", "critico"] as CustomerSentiment[]).map(
                  (sentiment) => (
                    <span
                      key={sentiment}
                      className="inline-flex items-center gap-1.5 text-xs text-ink-muted"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: SENTIMENT_BY_ID[sentiment].color,
                        }}
                      />
                      {SENTIMENT_BY_ID[sentiment].label}
                      <strong className="text-ink">{totals[sentiment]}</strong>
                    </span>
                  )
                )}
              </div>
            </section>

            <section className="mt-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">
                  Temi più richiesti
                </h2>
                {themeId ? (
                  <button
                    type="button"
                    onClick={() => setThemeId(null)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Azzera filtro tema
                  </button>
                ) : (
                  <p className="text-xs text-ink-faint">
                    Clicca un tema per filtrare i feedback
                  </p>
                )}
              </div>

              <ul className="mt-3 space-y-2">
                {themes.map((insight, index) => (
                  <li key={insight.theme.id}>
                    <ThemeRow
                      insight={insight}
                      rank={index + 1}
                      max={maxThemeCount}
                      active={themeId === insight.theme.id}
                      onSelect={() =>
                        setThemeId((prev) =>
                          prev === insight.theme.id ? null : insight.theme.id
                        )
                      }
                    />
                  </li>
                ))}
              </ul>

              {insights.otherRequests.length > 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-base px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Fuori catalogo
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {insights.otherRequests.map((request) => (
                      <li key={request.reportId} className="text-sm text-ink-muted">
                        <Link
                          href={`/rapporti?id=${request.reportId}`}
                          className="font-mono text-xs text-brand hover:underline"
                        >
                          {request.reportNumber}
                        </Link>{" "}
                        {request.text}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="mt-6 border-t border-border pt-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">
                  {activeTheme
                    ? `Feedback su «${activeTheme.theme.label}»`
                    : "Tutti i feedback"}
                  <span className="ml-2 text-xs font-normal text-ink-faint">
                    {visibleEntries.length}
                  </span>
                </h2>
                <div className="flex items-center gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Cerca nei feedback…"
                    className="w-56 rounded-lg border border-border bg-base px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand/50"
                  />
                  <div className="flex items-center gap-1">
                    {FILTERS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFilter(item.id)}
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-semibold transition-colors",
                          filter === item.id
                            ? "bg-brand-soft text-ink"
                            : "bg-base text-ink-muted hover:text-ink",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <ul className="mt-3 space-y-3 pb-8">
                {visibleEntries.length === 0 ? (
                  <li className="rounded-xl border border-border bg-base px-5 py-8 text-center text-sm text-ink-faint">
                    Nessun feedback con questi filtri.
                  </li>
                ) : (
                  visibleEntries.map((entry) => (
                    <li
                      key={entry.report.id}
                      className="rounded-xl border border-border bg-base px-5 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/rapporti?id=${entry.report.id}`}
                            className="font-mono text-xs font-semibold text-brand hover:underline"
                          >
                            {entry.report.reportNumber}
                          </Link>
                          <SentimentPill sentiment={entry.sentiment} compact />
                        </div>
                        <p className="text-xs text-ink-faint">
                          {entry.report.interventionDate}
                        </p>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-ink">
                        {entry.feedback || entry.requests.join(" · ")}
                      </p>

                      <p className="mt-2 text-xs text-ink-muted">
                        {entry.report.customerCompany ?? "Cliente non indicato"}{" "}
                        · {entry.report.machineModel} ·{" "}
                        {entry.report.technicianName}
                      </p>

                      {entry.requests.length > 0 ? (
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {entry.requests.map((request, index) => (
                            <li
                              key={`${request}-${index}`}
                              className="rounded-full bg-brand-soft/70 px-2.5 py-1 text-xs font-medium text-ink"
                            >
                              {request}
                            </li>
                          ))}
                        </ul>
                      ) : null}

                      {entry.themeIds.length > 0 ? (
                        <p className="mt-2 text-[11px] uppercase tracking-wide text-ink-faint">
                          {entry.themeIds
                            .map(
                              (id) =>
                                themes.find((item) => item.theme.id === id)
                                  ?.theme.label ?? id
                            )
                            .join(" · ")}
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function percent(value: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function StatCard({
  label,
  value,
  hint,
  color,
}: {
  label: string;
  value: string;
  hint: string;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-base px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold"
        style={{ color: color ?? "var(--color-ink, #0f172a)" }}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
    </div>
  );
}

function SentimentBar({
  positivo,
  neutro,
  critico,
  slim,
}: {
  positivo: number;
  neutro: number;
  critico: number;
  slim?: boolean;
}) {
  const total = positivo + neutro + critico;
  if (total === 0) return null;
  const segments: { sentiment: CustomerSentiment; value: number }[] = [
    { sentiment: "positivo", value: positivo },
    { sentiment: "neutro", value: neutro },
    { sentiment: "critico", value: critico },
  ];

  return (
    <div
      className={[
        "mt-2 flex w-full overflow-hidden rounded-full bg-surface",
        slim ? "h-1.5" : "h-3",
      ].join(" ")}
    >
      {segments.map(({ sentiment, value }) =>
        value > 0 ? (
          <span
            key={sentiment}
            title={`${SENTIMENT_BY_ID[sentiment].label}: ${value}`}
            style={{
              width: `${(value / total) * 100}%`,
              backgroundColor: SENTIMENT_BY_ID[sentiment].color,
            }}
          />
        ) : null
      )}
    </div>
  );
}

function ThemeRow({
  insight,
  rank,
  max,
  active,
  onSelect,
}: {
  insight: ThemeInsight;
  rank: number;
  max: number;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "w-full rounded-xl border px-5 py-3.5 text-left transition-colors",
        active
          ? "border-brand/40 bg-brand-soft/50"
          : "border-border bg-base hover:border-brand/30",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-ink-muted">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              {insight.theme.label}
            </p>
            <p className="text-xs text-ink-muted">
              {insight.count} {insight.count === 1 ? "segnalazione" : "segnalazioni"}
              {insight.critico > 0 ? ` · ${insight.critico} critiche` : ""}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-ink-muted">{insight.theme.hint}</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
              <span
                className="block h-full rounded-full bg-brand"
                style={{ width: `${(insight.count / max) * 100}%` }}
              />
            </div>
            <div className="w-24">
              <SentimentBar
                positivo={insight.positivo}
                neutro={insight.neutro}
                critico={insight.critico}
                slim
              />
            </div>
          </div>

          <ul className="mt-2 space-y-1">
            {insight.quotes.slice(0, 2).map((quote) => (
              <li
                key={`${quote.reportId}-${quote.text.slice(0, 12)}`}
                className="line-clamp-2 text-xs text-ink-muted"
              >
                <span className="font-mono text-brand">{quote.reportNumber}</span>{" "}
                {quote.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </button>
  );
}
