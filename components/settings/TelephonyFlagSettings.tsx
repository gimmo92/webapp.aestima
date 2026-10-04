"use client";

import { useEffect, useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  TELEPHONY_CATEGORIES,
  TELEPHONY_CATEGORY_LABELS,
} from "@/lib/telephony/classify";
import type { DepartmentId } from "@/lib/telephony/classify";

export function TelephonyFlagSettings() {
  const {
    telephonyEnabled,
    setTelephonyEnabled,
    telephonyRouting,
    telephonyConfidence,
    setTelephonyRouting,
  } = useInbox();
  const [routing, setRouting] = useState(telephonyRouting);
  const [confidence, setConfidence] = useState(String(telephonyConfidence));

  useEffect(() => {
    setRouting(telephonyRouting);
    setConfidence(String(telephonyConfidence));
  }, [telephonyRouting, telephonyConfidence]);

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
        {telephonyEnabled && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs font-semibold text-ink">Categoria → reparto</p>
            <p className="mt-1 text-xs text-ink-muted">
              La proposta AI usa questa mappa. Sotto la soglia di confidenza il
              ticket resta Da assegnare anche dopo la conferma.
            </p>
            <div className="mt-3 space-y-2">
              {TELEPHONY_CATEGORIES.map((category) => (
                <label
                  key={category}
                  className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-muted"
                >
                  <span>{TELEPHONY_CATEGORY_LABELS[category]}</span>
                  <select
                    value={routing[category] ?? ""}
                    onChange={(event) => {
                      const value = event.target.value;
                      setRouting((prev) => ({
                        ...prev,
                        [category]: (value || null) as DepartmentId | null,
                      }));
                    }}
                    className="rounded-lg border border-border bg-base px-2 py-1 text-sm text-ink"
                  >
                    <option value="">Nessuno</option>
                    {DEPARTMENTS.map((id) => (
                      <option key={id} value={id}>
                        {DEPARTMENT_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-xs text-ink-muted">
              Soglia di confidenza ({DEFAULT_CONFIDENCE_THRESHOLD} di default)
              <input
                value={confidence}
                onChange={(event) => setConfidence(event.target.value)}
                className="mt-1 w-24 rounded-lg border border-border bg-base px-2 py-1 text-sm text-ink"
              />
            </label>
            <button
              type="button"
              onClick={() => {
                const parsed = Number(confidence);
                setTelephonyRouting(
                  routing,
                  Number.isFinite(parsed) ? parsed : telephonyConfidence
                );
              }}
              className="mt-3 rounded-lg border border-border bg-base px-3 py-2 text-xs font-semibold text-ink hover:border-brand"
            >
              Salva mappa
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
