"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatAudioDuration } from "@/lib/whatsappData";
import { IconMic, IconPause, IconPlay } from "./WaIcons";

const BAR_COUNT = 40;

/** Barre deterministiche dall'id del messaggio: nessun mismatch in hydration. */
function waveformBars(seed: string): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  }
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    hash = (hash * 1103515245 + 12345) % 2147483648;
    const base = (hash / 2147483648) * 0.8 + 0.2;
    // Attenua gli estremi come fa WhatsApp sul profilo dell'onda.
    const envelope = 0.55 + 0.45 * Math.sin((Math.PI * (i + 1)) / (BAR_COUNT + 1));
    return Math.max(0.16, base * envelope);
  });
}

export function VoiceNote({
  messageId,
  seconds,
  audioUrl,
  outgoing,
  initials,
  avatarColor,
}: {
  messageId: string;
  seconds: number;
  audioUrl?: string;
  outgoing: boolean;
  initials: string;
  avatarColor: string;
}) {
  const bars = useMemo(() => waveformBars(messageId), [messageId]);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(seconds);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Vocali dummy (senza file): riproduzione simulata sulla durata dichiarata.
  useEffect(() => {
    if (audioUrl || !playing) return;
    const timer = window.setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;
        if (next >= duration) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(timer);
  }, [audioUrl, playing, duration]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) {
      setPlaying((prev) => !prev);
      return;
    }
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  }

  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const playedBars = Math.round(progress * BAR_COUNT);

  return (
    <div className="flex w-[19rem] max-w-full items-center gap-2 py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Metti in pausa" : "Riproduci messaggio vocale"}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#54656f] transition hover:bg-black/5"
      >
        {playing ? <IconPause size={22} /> : <IconPlay size={22} />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex h-8 items-center gap-[2px]">
          {bars.map((height, index) => (
            <span
              key={index}
              className="w-[3px] rounded-full"
              style={{
                height: `${Math.round(height * 26)}px`,
                backgroundColor:
                  index < playedBars
                    ? "#00a884"
                    : outgoing
                      ? "#9fc7a4"
                      : "#c7d0d4",
              }}
            />
          ))}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#667781]">
          <span>{formatAudioDuration(playing || elapsed > 0 ? elapsed : duration)}</span>
          <IconMic size={14} className={playing ? "text-[#00a884]" : "text-[#8696a0]"} />
        </div>
      </div>

      <div
        className="relative h-[3.25rem] w-[3.25rem] shrink-0 self-start overflow-hidden rounded-full"
        style={{ backgroundColor: avatarColor }}
      >
        <span className="flex h-full w-full items-center justify-center text-[15px] font-semibold text-white">
          {initials}
        </span>
      </div>

      {audioUrl ? (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            if (Number.isFinite(value) && value > 0) setDuration(value);
          }}
          onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
          onEnded={() => {
            setPlaying(false);
            setElapsed(0);
          }}
          className="hidden"
        />
      ) : null}
    </div>
  );
}
