"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  InterventionReportOutcomePill,
  InterventionReportTypePill,
} from "@/components/technicians/TechnicianBadges";
import {
  buildInterventionReportPdf,
  downloadPdfBytes,
  interventionReportPdfFilename,
} from "@/lib/interventionReportPdf";
import {
  listReports,
  subscribeReports,
  toInterventionReport,
  type InterventionReportRecord,
} from "@/lib/reportsStore";
import type { ReportSourceKind } from "@/lib/interventionReportDraft";

const SOURCE_LABELS: Record<ReportSourceKind, string> = {
  audio: "Vocale trascritto",
  testo: "Note scritte",
  documento: "Documento",
  chat: "Messaggio chat",
};

function formatCreatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportsWorkspace() {
  const [reports, setReports] = useState<InterventionReportRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);

  // localStorage è disponibile solo dopo il mount: evita mismatch di hydration.
  useEffect(() => {
    const sync = () => setReports(listReports());
    sync();
    return subscribeReports(sync);
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((report) =>
      [
        report.reportNumber,
        report.summary,
        report.technicianName,
        report.machineModel,
        report.customerCompany ?? "",
        report.partsUsed.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, reports]);

  const active =
    visible.find((report) => report.id === activeId) ?? visible[0] ?? null;

  async function exportPdf(record: InterventionReportRecord) {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const report = toInterventionReport(record);
      const bytes = await buildInterventionReportPdf(
        report,
        record.technicianName
      );
      downloadPdfBytes(bytes, interventionReportPdfFilename(report));
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="flex w-[25rem] shrink-0 flex-col border-r border-border bg-base">
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-lg font-bold text-ink">Rapporti d&apos;intervento</h1>
          <p className="mt-1 text-xs text-ink-muted">
            Compilati dall&apos;AI sui vocali, i messaggi e i documenti inviati dai
            tecnici.
          </p>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cerca per numero, macchina, tecnico, ricambio…"
            className="mt-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand/50"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-ink-faint">
              {reports.length === 0
                ? "Nessun rapporto salvato. Creane uno da una chat WhatsApp."
                : "Nessun rapporto corrisponde alla ricerca."}
            </p>
          ) : (
            visible.map((report) => {
              const isActive = active?.id === report.id;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setActiveId(report.id)}
                  className={[
                    "w-full border-b border-border px-5 py-3 text-left transition-colors",
                    isActive ? "bg-brand-soft/60" : "hover:bg-surface",
                  ].join(" ")}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-xs font-semibold text-brand">
                      {report.reportNumber}
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {report.interventionDate}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-ink">
                    {report.summary}
                  </p>
                  <p className="mt-1 truncate text-xs text-ink-muted">
                    {report.technicianName} · {report.machineModel}
                  </p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <InterventionReportTypePill type={report.type} compact />
                    <InterventionReportOutcomePill
                      outcome={report.outcome}
                      compact
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto bg-surface/40">
        {!active ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <p className="text-sm text-ink-muted">
              Qui arrivano i rapporti salvati dalle chat WhatsApp.
            </p>
            <Link
              href="/whatsapp"
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
            >
              Vai alle chat WhatsApp
            </Link>
          </div>
        ) : (
          <article className="mx-auto max-w-3xl px-8 py-6">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
              <div>
                <p className="font-mono text-sm font-semibold text-brand">
                  {active.reportNumber}
                </p>
                <h2 className="mt-1 text-xl font-bold text-ink">
                  {active.summary}
                </h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Creato il {formatCreatedAt(active.createdAtIso)} da chat
                  WhatsApp
                  {active.aiSource === "anthropic"
                    ? " · bozza scritta dall'AI"
                    : " · bozza compilata con regole locali"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => exportPdf(active)}
                  disabled={pdfBusy}
                  className="rounded-lg border border-border bg-base px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:text-brand disabled:opacity-60"
                >
                  {pdfBusy ? "Preparo il PDF…" : "Esporta PDF"}
                </button>
                <Link
                  href="/whatsapp"
                  className="rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-strong"
                >
                  Apri la chat
                </Link>
              </div>
            </header>

            <div className="mt-5 flex items-center gap-2">
              <InterventionReportTypePill type={active.type} />
              <InterventionReportOutcomePill outcome={active.outcome} />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <DetailField label="Tecnico" value={active.technicianName} />
              <DetailField
                label="Contatto"
                value={active.technicianPhone ?? "—"}
              />
              <DetailField
                label="Cliente"
                value={active.customerCompany ?? "—"}
              />
              <DetailField label="Macchina" value={active.machineModel} />
              <DetailField
                label="Matricola"
                value={active.machineSerial ?? "—"}
              />
              <DetailField
                label="Data intervento"
                value={active.interventionDate}
              />
              <DetailField label="Ore uomo" value={String(active.hours)} />
              <DetailField
                label="Ricambi"
                value={
                  active.partsUsed.length > 0
                    ? active.partsUsed.join(", ")
                    : "Nessuno"
                }
              />
            </dl>

            <section className="mt-6">
              <h3 className="text-sm font-semibold text-ink">Lavori eseguiti</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">
                {active.workPerformed}
              </p>
            </section>

            {active.followUp ? (
              <section className="mt-5 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3">
                <h3 className="text-sm font-semibold text-ink">Follow-up</h3>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  {active.followUp}
                </p>
              </section>
            ) : null}

            <section className="mt-6 border-t border-border pt-5">
              <h3 className="text-sm font-semibold text-ink">
                Fonti usate dall&apos;AI
              </h3>
              <ul className="mt-3 space-y-2">
                {active.sources.map((source, index) => (
                  <li
                    key={`${source.label}-${index}`}
                    className="rounded-lg border border-border bg-base px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {SOURCE_LABELS[source.kind]}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-ink">
                      {source.label}
                    </p>
                    {source.excerpt ? (
                      <p className="mt-1 text-sm leading-6 text-ink-muted">
                        {source.excerpt}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </article>
        )}
      </section>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}
