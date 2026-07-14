import Link from "next/link";
import type { KbMatchPreview } from "@/lib/serviceChatTypes";

export function KbMatchBanner({ match }: { match: KbMatchPreview }) {
  const href = `/manuale?entry=${encodeURIComponent(match.entryId)}`;

  return (
    <div className="mt-3 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3">
      <div className="mb-1 flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-ok"
          aria-hidden="true"
        >
          <path
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
        <p className="text-xs font-bold uppercase tracking-wider text-ok">
          Referenza knowledge base
        </p>
      </div>
      <p className="text-sm leading-relaxed text-ink-muted">
        Problema già risolto in un intervento precedente
        {match.frequency && match.frequency > 1
          ? ` — riscontrato ${match.frequency} volte`
          : ""}
        . Nessun ticket necessario.
      </p>
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        Vedi scheda {match.entryId} nel Manuale
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12h14M13 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <p className="mt-1 text-xs text-ink-faint">{match.symptom}</p>
    </div>
  );
}
