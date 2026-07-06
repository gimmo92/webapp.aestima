"use client";

import { useCallback, useState } from "react";
import { Header } from "@/components/Header";
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

// Pagina principale: orchestra il flusso a 4 step della demo aestima.

export default function Home() {
  const [step, setStep] = useState(1);
  const [request, setRequest] = useState(SAMPLE_REQUEST);

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [apiDone, setApiDone] = useState(false);

  // Avvia l'analisi: passa allo step 2 e chiama /api/analyze in parallelo.
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
      // Se anche la route fallisse (offline), usiamo il mock lato client.
      setAnalysis(mockAnalyze(request));
    } finally {
      setApiDone(true);
    }
  }, [request]);

  // L'animazione ha finito e l'API ha risposto: calcola il match e vai allo step 3.
  const handleProcessingComplete = useCallback(() => {
    if (!analysis) return;
    setMatch(matchAnalysisToData(analysis));
    setStep(3);
  }, [analysis]);

  // Genera il preventivo dai dati identificati.
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
    <div className="min-h-screen bg-grid">
      <Header />

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:pt-12">
        {/* Intro (solo allo step 1) */}
        {step === 1 && (
          <div className="mb-9 text-center">
            <h1 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Dalla richiesta del cliente al{" "}
              <span className="text-brand">preventivo pronto</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-[0.98rem] leading-relaxed text-ink-muted">
              L&apos;agente aestima legge una richiesta di ricambio in
              linguaggio naturale, identifica macchina e componente sulla
              distinta e prepara l&apos;offerta. Tu approvi.
            </p>
          </div>
        )}

        {/* Barra di avanzamento */}
        <div className="mb-8">
          <Stepper current={step} />
        </div>

        {/* Contenuto per step */}
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
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-ink-faint">
        aestima · demo commerciale — dati e azienda a scopo dimostrativo ·
        L&apos;approvazione finale resta al tecnico
      </footer>
    </div>
  );
}
