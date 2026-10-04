"use client";

import { useInbox } from "@/components/inbox/InboxProvider";

export function TelephonyFlagSettings() {
  const { telephonyEnabled, setTelephonyEnabled } = useInbox();

  return (
    <section className="mx-auto max-w-3xl px-5 pt-8 sm:px-8">
      <div className="rounded-2xl border border-border bg-surface/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-ink">Telefonia</h2>
            <p className="mt-1 max-w-xl text-xs text-ink-muted">
              Se acceso, le chiamate terminate possono aprire un ticket con
              origine Telefono. Una chiamata persa o in segreteria resta in
              «Da richiamare».
            </p>
            <p className="mt-2 text-xs font-medium text-ink">
              {telephonyEnabled ? "Acceso per questa azienda" : "Spento"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTelephonyEnabled(!telephonyEnabled)}
            className={[
              "rounded-lg px-3 py-2 text-sm font-semibold",
              telephonyEnabled
                ? "border border-border bg-base text-ink-muted hover:text-ink"
                : "bg-brand text-white shadow-lg shadow-brand/20 hover:bg-brand-strong",
            ].join(" ")}
            aria-pressed={telephonyEnabled}
          >
            {telephonyEnabled ? "Spegni" : "Accendi"}
          </button>
        </div>
      </div>
    </section>
  );
}
