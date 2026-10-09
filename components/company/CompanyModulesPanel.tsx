"use client";

import { useState, useTransition } from "react";
import { updateCompanyModuleAction } from "@/app/actions/auth";
import {
  COMPANY_MODULES,
  type CompanyModuleId,
  type CompanyModules,
} from "@/lib/companyModules";
import { publishCompanyModules } from "@/lib/useCompanyModules";
import { useI18n } from "@/lib/i18n";

export function CompanyModulesPanel({
  initial,
  canManage,
}: {
  initial: CompanyModules;
  canManage: boolean;
}) {
  const { t } = useI18n();
  const [modules, setModules] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (id: CompanyModuleId) => {
    if (!canManage || pending) return;
    const next = { ...modules, [id]: !modules[id] };
    setModules(next);
    setError(null);
    publishCompanyModules(next);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("module", id);
      formData.set("enabled", next[id] ? "1" : "0");
      const result = await updateCompanyModuleAction(formData);
      if (result.error) {
        setModules(modules);
        publishCompanyModules(modules);
        setError(result.error);
      }
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-5">
      <h2 className="text-sm font-semibold text-ink">{t("company.modules")}</h2>
      <p className="mt-1 text-xs text-ink-faint">{t("company.modulesHint")}</p>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <ul className="mt-4 divide-y divide-border">
        {COMPANY_MODULES.map((item) => {
          const on = modules[item.id];
          return (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-sm text-ink">{t(item.labelKey)}</span>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={!canManage || pending}
                onClick={() => toggle(item.id)}
                className={[
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
                  on ? "bg-brand" : "bg-surface-2",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    on ? "left-5" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
