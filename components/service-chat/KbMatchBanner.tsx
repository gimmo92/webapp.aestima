import Link from "next/link";
import type { KbMatchPreview } from "@/lib/serviceChatTypes";

export function KbMatchBanner({ match }: { match: KbMatchPreview }) {
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
            d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-xs font-bold uppercase tracking-wider text-ok">
          Soluzione dalla knowledge base
        </p>
      </div>
      <p className="text-sm leading-relaxed text-ink-muted">
        Problema già risolto in un intervento precedente
        {match.frequency && match.frequency > 1
          ? ` (${match.frequency} volte)`
          : ""}
        . Il sistema ha imparato da quella esperienza — nessun ticket necessario.
      </p>
      <p className="mt-1 text-xs text-ink-faint">
        Voce{" "}
        <Link href="/manuale" className="font-mono text-brand hover:underline">
          {match.entryId}
        </Link>
        {" · "}
        {match.symptom}
      </p>
    </div>
  );
}
