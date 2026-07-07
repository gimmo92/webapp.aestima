import { Logo } from "@/components/Logo";
import { COMPANY } from "@/lib/mockData";
import {
  REPORT_OUTCOME_BY_ID,
  REPORT_TYPE_BY_ID,
} from "@/lib/technicianData";
import type { InterventionReport } from "@/lib/technicianTypes";

interface Props {
  report: InterventionReport;
  technicianName: string;
}

export function InterventionReportSheet({ report, technicianName }: Props) {
  const typeLabel = REPORT_TYPE_BY_ID[report.type]?.label ?? report.type;
  const outcomeLabel = REPORT_OUTCOME_BY_ID[report.outcome]?.label ?? report.outcome;

  return (
    <article
      id="report-printable"
      className="overflow-hidden rounded-2xl border border-border bg-white text-slate-800 shadow-2xl shadow-black/40"
    >
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
            Rapporto di intervento
          </p>
          <p className="mt-1 font-mono text-sm text-slate-600">{report.reportNumber}</p>
          <p className="text-sm text-slate-500">{report.interventionDateFull}</p>
        </div>
      </div>

      <div className="px-8 py-6">
        <div className="mb-5 grid gap-4 sm:grid-cols-2">
          <SheetField label="Macchina">
            <p className="font-medium text-slate-800">{report.machineModel}</p>
            <p className="font-mono text-sm text-slate-600">{report.machineSerial}</p>
          </SheetField>
          <SheetField label="Tecnico">
            <p className="font-medium text-slate-800">{technicianName}</p>
            <p className="text-sm text-slate-500">{report.hours} ore uomo</p>
          </SheetField>
          <SheetField label="Tipologia">
            <p className="font-medium text-slate-800">{typeLabel}</p>
          </SheetField>
          <SheetField label="Esito">
            <p className="font-medium text-slate-800">{outcomeLabel}</p>
          </SheetField>
          {report.customerCompany && (
            <SheetField label="Cliente" className="sm:col-span-2">
              <p className="font-medium text-slate-800">{report.customerCompany}</p>
            </SheetField>
          )}
        </div>

        <SheetBlock title="Sintesi">{report.summary}</SheetBlock>
        <SheetBlock title="Lavori eseguiti">{report.workPerformed}</SheetBlock>

        {report.partsUsed && report.partsUsed.length > 0 && (
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Ricambi utilizzati
            </p>
            <p className="mt-2 font-mono text-sm text-slate-700">
              {report.partsUsed.join(" · ")}
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-8 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <div>
            <p className="mb-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Firma tecnico
            </p>
            <div className="border-b border-slate-300" />
          </div>
          <div>
            <p className="mb-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Firma cliente
            </p>
            <div className="border-b border-slate-300" />
          </div>
        </div>
      </div>
    </article>
  );
}

function SheetField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {children}
    </div>
  );
}

function SheetBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{children}</p>
    </div>
  );
}
