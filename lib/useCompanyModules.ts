"use client";

import { useEffect, useState } from "react";
import {
  MODULES_EVENT,
  defaultCompanyModules,
  modulesFromSettings,
  type CompanyModules,
} from "@/lib/companyModules";
import { readCachedCompany, writeCachedCompany } from "@/lib/companyFeatures";

export function publishCompanyModules(modules: CompanyModules) {
  const cached = readCachedCompany();
  writeCachedCompany({
    slug: cached?.slug,
    name: cached?.name,
    modules,
  });
  window.dispatchEvent(new CustomEvent(MODULES_EVENT, { detail: modules }));
}

/** Moduli attivi per la company corrente. Prima della risposta restano tutti accesi, salvo cache. */
export function useCompanyModules(): CompanyModules {
  const [modules, setModules] = useState<CompanyModules>(defaultCompanyModules);

  useEffect(() => {
    const cached = readCachedCompany()?.modules;
    if (cached) setModules(modulesFromSettings({ modules: cached }));

    let cancelled = false;
    fetch("/api/me")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const next = data?.user?.company?.modules;
        if (!next || typeof next !== "object") return;
        const parsed = modulesFromSettings({ modules: next });
        setModules(parsed);
        const company = data.user.company as { slug?: string; name?: string };
        writeCachedCompany({
          slug: company.slug,
          name: company.name,
          modules: parsed,
        });
      })
      .catch(() => undefined);

    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<CompanyModules>).detail;
      if (detail) setModules(modulesFromSettings({ modules: detail }));
    };
    window.addEventListener(MODULES_EVENT, onChange);
    return () => {
      cancelled = true;
      window.removeEventListener(MODULES_EVENT, onChange);
    };
  }, []);

  return modules;
}
