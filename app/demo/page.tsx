"use client";

import { useCallback, useState } from "react";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { Stepper } from "@/components/Stepper";
import { RequestInput } from "@/components/RequestInput";
import { ProcessingAnimation } from "@/components/ProcessingAnimation";
import { PartIdentified } from "@/components/PartIdentified";
import { QuoteDocument } from "@/components/QuoteDocument";
import { SAMPLE_REQUEST } from "@/lib/mockData";
import { matchAnalysisToData } from "@/lib/match";
import { mockAnalyze } from "@/lib/mockAnalyze";
import { buildQuote } from "@/lib/quote";
import type { AnalysisResult, MatchResult, Quote } from "@/lib/types";

// Flusso guidato a 4 step: dalla richiesta al preventivo.

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState(SAMPLE_REQUEST);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [apiDone, setApiDone] = useState(false);

  const handleAnalyze = useCallback(async () => {
    setStep(2);
    setApiDone(false);
    setAnalysis(null);

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
    setStep(1);
    setAnalysis(null);
    setMatch(null);
    setQuote(null);
    setApiDone(false);
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
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
