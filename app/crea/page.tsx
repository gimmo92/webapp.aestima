"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { Stepper } from "@/components/Stepper";
import { RequestInput } from "@/components/RequestInput";
import { ProcessingAnimation } from "@/components/ProcessingAnimation";
import { PartIdentified } from "@/components/PartIdentified";
import { QuoteDocument } from "@/components/QuoteDocument";
import { SAMPLE_REQUEST } from "@/lib/mockData";
import { matchAnalysisToData } from "@/lib/match";
import { mockAnalyze } from "@/lib/mockAnalyze";
import { buildQuote, buildQuoteFromLines } from "@/lib/quote";
import {
  clearQuoteDraft,
  draftToQuoteLines,
  readQuoteDraft,
} from "@/lib/quoteDraft";
import type { AnalysisResult, MatchResult, Quote } from "@/lib/types";

function analysisFromQuote(quote: Quote): AnalysisResult {
  return {
    macchina: "",
    numero_serie: "",
    componente_identificato: quote.componentTitle,
    urgenza: "normale",
    note: "",
    source: "mock",
  };
}

function CreaOffertaWorkspace() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(() =>
    searchParams.get("draft") === "1" && readQuoteDraft().length > 0 ? 4 : 1
  );
  const [request, setRequest] = useState(SAMPLE_REQUEST);
  const [fromDraft, setFromDraft] = useState(
    () => searchParams.get("draft") === "1" && readQuoteDraft().length > 0
  );

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    if (searchParams.get("draft") !== "1") return null;
    const lines = draftToQuoteLines(readQuoteDraft());
    if (lines.length === 0) return null;
    return analysisFromQuote(buildQuoteFromLines(lines));
  });
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(() => {
    if (searchParams.get("draft") !== "1") return null;
    const lines = draftToQuoteLines(readQuoteDraft());
    if (lines.length === 0) return null;
    return buildQuoteFromLines(lines);
  });
  const [apiDone, setApiDone] = useState(false);

  useEffect(() => {
    if (searchParams.get("draft") !== "1") return;
    const lines = draftToQuoteLines(readQuoteDraft());
    if (lines.length === 0) return;
    const next = buildQuoteFromLines(lines);
    setQuote(next);
    setAnalysis(analysisFromQuote(next));
    setFromDraft(true);
    setStep(4);
  }, [searchParams]);

  const handleAnalyze = useCallback(async () => {
    setStep(2);
    setApiDone(false);
    setAnalysis(null);
    setFromDraft(false);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const data: AnalysisResult = res.ok
        ? await res.json()
        : mockAnalyze(request);
      setAnalysis(data);
    } catch {
      setAnalysis(mockAnalyze(request));
    } finally {
      setApiDone(true);
    }
  }, [request]);

  const handleProcessingComplete = useCallback(() => {
    if (!analysis) return;
    setMatch(matchAnalysisToData(analysis));
    setStep(3);
  }, [analysis]);

  const handleGenerate = useCallback(() => {
    if (!analysis || !match?.machine || !match?.component) return;
    setQuote(buildQuote(match.machine, match.component, analysis));
    setStep(4);
  }, [analysis, match]);

  const restart = useCallback(() => {
    clearQuoteDraft();
    setStep(1);
    setAnalysis(null);
    setMatch(null);
    setQuote(null);
    setApiDone(false);
    setFromDraft(false);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-base">
      <InboxTopBar />

      <main className="min-h-0 flex-1 overflow-y-auto bg-grid">
        <div className="mx-auto max-w-3xl px-5 pb-16 pt-8">
          <div className="mb-8">
            <Stepper current={step} />
          </div>

          {step === 1 && (
            <RequestInput
              value={request}
              onChange={setRequest}
              onSubmit={handleAnalyze}
            />
          )}

          {step === 2 && (
            <ProcessingAnimation
              apiDone={apiDone}
              onComplete={handleProcessingComplete}
              source={analysis?.source}
            />
          )}

          {step === 3 && analysis && match && (
            <PartIdentified
              analysis={analysis}
              match={match}
              onBack={restart}
              onGenerate={handleGenerate}
            />
          )}

          {step === 4 && quote && analysis && (
            <QuoteDocument
              quote={quote}
              analysis={analysis}
              onRestart={restart}
              onBack={fromDraft ? restart : () => setStep(3)}
              asOrder={searchParams.get("ordine") === "1"}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default function CreaOffertaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <CreaOffertaWorkspace />
    </Suspense>
  );
}
