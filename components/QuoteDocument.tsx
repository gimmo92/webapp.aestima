"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { HumanNote } from "./HumanNote";
import { COMPANY, euro } from "@/lib/quote";
import type { AnalysisResult, Quote } from "@/lib/types";

// STEP 4 — Preventivo generato su "carta intestata" simulata.

interface Props {
  quote: Quote;
  analysis: AnalysisResult;
  onRestart: () => void;
  onBack: () => void;
}

export function QuoteDocument({ quote, analysis, onRestart, onBack }: Props) {
  const [approved, setApproved] = useState(false);

  // "Esporta PDF": usa il dialog di stampa del browser (Salva come PDF).
  // Il CSS @media print mostra solo il documento #quote-printable.
  const exportPdf = () => window.print();

  return (
    <section className="animate-fade-up space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            Passo 4 — Preventivo pronto
          </div>
          <h2 className="text-xl font-bold text-ink sm:text-2xl">
            Bozza di offerta, pronta per la tua revisione
          </h2>
        </div>
      </div>

      {approved && (
        <div className="flex items-center gap-2.5 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm font-medium text-ok">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M4 10.5 8 14.5 16 5.5"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Preventivo approvato dal tecnico — pronto per l&apos;invio al cliente.
        </div>
      )}

      {/* ---- Documento su carta intestata ---- */}
      <article
        id="quote-printable"
        className="overflow-hidden rounded-2xl border border-border bg-white text-slate-800 shadow-2xl shadow-black/40"
      >
        {/* Intestazione */}
        <div className="flex flex-col gap-4 border-b-2 border-slate-200 bg-slate-50 px-8 py-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 [&_span]:!text-slate-900">
              <Logo />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {COMPANY.tagline}
            </p>
            <div className="mt-2 text-xs leading-relaxed text-slate-500">
              <p>{COMPANY.address}</p>
              <p>
                {COMPANY.vat} · {COMPANY.email} · {COMPANY.phone}
              </p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-slate-900">
              Preventivo
            </p>
            <p className="mt-1 font-mono text-sm text-slate-600">
              {quote.number}
            </p>
            <p className="text-sm text-slate-500">Data: {quote.date}</p>
          </div>
        </div>

        {/* Corpo */}
        <div className="px-8 py-6">
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Spettabile cliente
              </p>
              <p className="font-medium text-slate-800">{quote.customerName}</p>
              <p className="text-sm text-slate-500">
                Rif. matricola: {analysis.numero_serie || "n/d"}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Disponibilità
              </p>
              {quote.availability === "disponibile" ? (
                <p className="font-medium text-emerald-600">
                  Disponibile a magazzino
                </p>
              ) : (
                <p className="font-medium text-amber-600">
                  Da ordinare · {quote.leadTimeDays} gg lavorativi
                </p>
              )}
            </div>
          </div>

          {/* Righe */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left text-xs uppercase tracking-wider text-slate-400">
                <th className="py-2 pr-2 font-semibold">Codice</th>
                <th className="py-2 pr-2 font-semibold">Descrizione</th>
                <th className="py-2 pr-2 text-center font-semibold">Q.tà</th>
                <th className="py-2 pr-2 text-right font-semibold">Prezzo</th>
                <th className="py-2 text-right font-semibold">Totale</th>
              </tr>
            </thead>
            <tbody>
              {quote.lines.map((line) => (
                <tr key={line.code} className="border-b border-slate-100">
                  <td className="py-3 pr-2 align-top font-mono text-slate-700">
                    {line.code}
                  </td>
                  <td className="py-3 pr-2 align-top text-slate-700">
                    {line.description}
                  </td>
                  <td className="py-3 pr-2 text-center align-top text-slate-700">
                    {line.qty}
                  </td>
                  <td className="py-3 pr-2 text-right align-top text-slate-700">
                    {euro(line.unitPrice)}
                  </td>
                  <td className="py-3 text-right align-top font-medium text-slate-800">
                    {euro(line.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totali */}
          <div className="mt-5 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-sm">
              <TotRow k="Imponibile" v={euro(quote.subtotal)} />
              {quote.urgencySurcharge > 0 && (
                <TotRow
                  k={`Maggiorazione urgenza (${quote.urgencySurchargePct}%)`}
                  v={euro(quote.urgencySurcharge)}
                  accent
                />
              )}
              <TotRow k={`IVA (${quote.vatPct}%)`} v={euro(quote.vat)} />
              <div className="mt-2 flex items-center justify-between border-t-2 border-slate-200 pt-2.5">
                <span className="text-base font-bold text-slate-900">
                  Totale
                </span>
                <span className="text-base font-bold text-slate-900">
                  {euro(quote.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Condizioni */}
          <div className="mt-7 rounded-lg bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500">
            <p className="mb-1 font-semibold text-slate-600">Condizioni</p>
            <p>{quote.notes}</p>
            <p>
              Validità offerta 30 giorni · Pagamento a 30 gg data fattura ·
              Trasporto escluso · Prezzi IVA esclusa in tabella.
            </p>
            <p className="mt-1 italic">
              Documento generato da aestima come bozza. L&apos;approvazione
              finale resta al tecnico.
            </p>
          </div>
        </div>
      </article>

      <HumanNote />

      {/* ---- Azioni (nascoste in stampa) ---- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M19 12H5M11 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Indietro
        </button>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={exportPdf}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:border-brand/60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 3v12m0 0-4-4m4 4 4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Esporta PDF
          </button>

          <button
            onClick={() => setApproved(true)}
            disabled={approved}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ok px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ok/20 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 10.5 8 14.5 16 5.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {approved ? "Approvato" : "Approva"}
          </button>
        </div>
      </div>

      <div className="pt-2 text-center">
        <button
          onClick={onRestart}
          className="text-sm text-ink-faint underline-offset-4 transition-colors hover:text-ink hover:underline"
        >
          Nuova richiesta
        </button>
      </div>
    </section>
  );
}

function TotRow({
  k,
  v,
  accent,
}: {
  k: string;
  v: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={accent ? "text-amber-600" : "text-slate-500"}>{k}</span>
      <span className={accent ? "font-medium text-amber-600" : "text-slate-700"}>
        {v}
      </span>
    </div>
  );
}
