import { Logo } from "./Logo";
import { COMPANY, euro } from "@/lib/quote";
import type { Quote } from "@/lib/types";

// Documento preventivo su "carta intestata" simulata.
// Componente riutilizzabile: usato sia nella demo (QuoteDocument) sia
// nell'anteprima PDF allegata alla mail di risposta nell'inbox.
//
// Porta l'id #quote-printable: le regole @media print in globals.css
// stampano SOLO questo documento (funzione "Scarica PDF").

interface Props {
  quote: Quote;
  /** Nome cliente da mostrare (se assente usa quote.customerName). */
  customerName?: string;
  /** Matricola di riferimento da mostrare in intestazione cliente. */
  serial?: string;
}

export function QuoteSheet({ quote, customerName, serial }: Props) {
  return (
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
          <p className="text-sm font-medium text-slate-500">{COMPANY.tagline}</p>
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
          <p className="mt-1 font-mono text-sm text-slate-600">{quote.number}</p>
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
            <p className="font-medium text-slate-800">
              {customerName ?? quote.customerName}
            </p>
            <p className="text-sm text-slate-500">
              Rif. matricola: {serial || "n/d"}
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
              <span className="text-base font-bold text-slate-900">Totale</span>
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
        </div>
      </div>
    </article>
  );
}

function TotRow({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={accent ? "text-amber-600" : "text-slate-500"}>{k}</span>
      <span className={accent ? "font-medium text-amber-600" : "text-slate-700"}>
        {v}
      </span>
    </div>
  );
}
