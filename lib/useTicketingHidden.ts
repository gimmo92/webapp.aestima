"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import {
  isTicketingHiddenForCompany,
  readCachedCompany,
  writeCachedCompany,
  type CompanyNavRef,
} from "@/lib/companyFeatures";

/** True solo se la company è in lista nascosta; false finché non è nota. */
export function useTicketingHidden(fallbackName?: string): boolean {
  const [company, setCompany] = useState<CompanyNavRef | null>(null);
  const [known, setKnown] = useState(false);

  useLayoutEffect(() => {
    const cached = readCachedCompany();
    if (!cached) return;
    setCompany(cached);
    setKnown(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return;
        const next = (data?.user?.company ?? null) as CompanyNavRef | null;
        if (next?.slug || next?.name) {
          writeCachedCompany(next);
          setCompany(next);
        }
        setKnown(true);
      })
      .catch(() => {
        if (!cancelled) setKnown(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!known) return false;
  return isTicketingHiddenForCompany({
    slug: company?.slug,
    name: company?.name || fallbackName,
  });
}
