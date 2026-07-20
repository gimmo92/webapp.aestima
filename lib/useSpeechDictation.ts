"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultLike = {
  readonly isFinal: boolean;
  readonly 0: { transcript: string };
};

type SpeechRecognitionEventLike = {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike> & {
    readonly length: number;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function joinTranscript(base: string, addition: string): string {
  const a = addition.trim();
  if (!a) return base;
  if (!base) return a;
  return base.endsWith(" ") || base.endsWith("\n") ? `${base}${a}` : `${base} ${a}`;
}

export function isSpeechDictationSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

/**
 * Dettatura vocale via Web Speech API (it-IT).
 * Scrive nel campo testo: risultati finali accumulati + interim in anteprima.
 */
export function useSpeechDictation({
  lang = "it-IT",
  onTranscript,
  enabled = true,
}: {
  lang?: string;
  onTranscript: (text: string) => void;
  enabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const committedRef = useRef("");
  const wantListeningRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    setSupported(getSpeechRecognitionCtor() !== null);
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    }
    setListening(false);
  }, []);

  const start = useCallback(
    (currentText: string) => {
      setError(null);
      const Ctor = getSpeechRecognitionCtor();
      if (!Ctor || !enabled) {
        setError("La dettatura non è supportata in questo browser.");
        return;
      }

      stop();

      const recognition = new Ctor();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      baseTextRef.current = currentText.trimEnd();
      committedRef.current = "";
      wantListeningRef.current = true;
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let newlyFinal = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const piece = result[0]?.transcript ?? "";
          if (result.isFinal) newlyFinal += piece;
          else interim += piece;
        }

        if (newlyFinal.trim()) {
          committedRef.current = joinTranscript(
            committedRef.current,
            newlyFinal
          );
        }

        const withCommitted = joinTranscript(
          baseTextRef.current,
          committedRef.current
        );
        const next = interim.trim()
          ? joinTranscript(withCommitted, interim)
          : withCommitted;
        onTranscriptRef.current(next);
      };

      recognition.onerror = (event) => {
        const code = event.error;
        if (code === "aborted" || code === "no-speech") return;
        wantListeningRef.current = false;
        setListening(false);
        if (code === "not-allowed") {
          setError("Permesso microfono negato. Abilitalo nelle impostazioni del browser.");
        } else if (code === "network") {
          setError("Errore di rete durante la dettatura. Riprova.");
        } else {
          setError("Impossibile avviare la dettatura. Riprova.");
        }
      };

      recognition.onend = () => {
        if (wantListeningRef.current && recognitionRef.current === recognition) {
          try {
            recognition.start();
            return;
          } catch {
            wantListeningRef.current = false;
          }
        }
        setListening(false);
        if (recognitionRef.current === recognition) {
          recognitionRef.current = null;
        }
      };

      try {
        recognition.start();
        setListening(true);
      } catch {
        wantListeningRef.current = false;
        recognitionRef.current = null;
        setListening(false);
        setError("Impossibile avviare la dettatura. Riprova.");
      }
    },
    [enabled, lang, stop]
  );

  const toggle = useCallback(
    (currentText: string) => {
      if (listening) stop();
      else start(currentText);
    },
    [listening, start, stop]
  );

  useEffect(() => {
    if (!enabled && listening) stop();
  }, [enabled, listening, stop]);

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      if (rec) {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { supported, listening, error, start, stop, toggle, clearError };
}
