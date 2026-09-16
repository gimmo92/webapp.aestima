"use client";

import {
  buildReportDraftFallback,
  type ReportDraft,
  type ReportDraftInput,
} from "./interventionReportDraft";

export interface ReportDraftResult {
  draft: ReportDraft;
  source: "anthropic" | "fallback";
  warning?: string;
}

/**
 * Chiede la bozza del rapporto all'AI. Qualunque errore di rete
 * degrada sulla bozza locale: il flusso in chat non si blocca mai.
 */
export async function requestReportDraft(
  input: ReportDraftInput
): Promise<ReportDraftResult> {
  try {
    const res = await fetch("/api/intervention-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await res.json()) as Partial<ReportDraftResult> & {
      error?: string;
    };

    if (!res.ok || !data.draft) {
      return {
        draft: buildReportDraftFallback(input),
        source: "fallback",
        warning: data.error ?? "Servizio AI non raggiungibile.",
      };
    }

    return {
      draft: data.draft,
      source: data.source ?? "fallback",
      warning: data.warning,
    };
  } catch {
    return {
      draft: buildReportDraftFallback(input),
      source: "fallback",
      warning: "Rete non disponibile: bozza compilata in locale.",
    };
  }
}
