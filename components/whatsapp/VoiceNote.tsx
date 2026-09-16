"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatAudioDuration } from "@/lib/whatsappData";
import { IconMic, IconPause, IconPlay } from "./WaIcons";

const BAR_COUNT = 38;
const WAVE_HEIGHT = 26;

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
    return Math.max(0.18, base * envelope);
  });
}

export function VoiceNote({
  messageId,
  seconds,
  audioUrl,
  outgoing,
  initials,
  avatarColor,
  bubbleColor,
}: {
  messageId: string;
  seconds: number;
  audioUrl?: string;
  outgoing: boolean;
  initials: string;
  avatarColor: string;
  /** Sfondo della bolla: serve al badge microfono sull'avatar. */
  bubbleColor: string;
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

  /** Click sull'onda: salta al punto corrispondente, come su WhatsApp. */
  function seek(event: React.MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || duration <= 0) return;
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    const target = ratio * duration;
    const audio = audioRef.current;
    if (audio) audio.currentTime = target;
    setElapsed(target);
  }

  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const playedBars = progress * BAR_COUNT;
  const started = playing || elapsed > 0;

  return (
    <div className="grid w-[19rem] max-w-full grid-cols-[2.25rem_1fr_3.25rem] items-center gap-x-2.5 py-0.5">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Metti in pausa" : "Riproduci messaggio vocale"}
        className="col-start-1 row-start-1 flex h-9 w-9 items-center justify-center rounded-full text-[#5e5b58] transition hover:bg-black/5"
      >
        {playing ? <IconPause size={22} /> : <IconPlay size={22} />}
      </button>

      <button
        type="button"
        onClick={seek}
        aria-label="Vai a un punto del messaggio vocale"
        className="col-start-2 row-start-1 flex w-full items-center justify-between"
        style={{ height: `${WAVE_HEIGHT}px` }}
      >
        {bars.map((height, index) => {
          // La barra a cavallo del cursore si colora in proporzione.
          const filled = Math.min(1, Math.max(0, playedBars - index));
          return (
            <span
              key={index}
              className="relative w-[2.5px] overflow-hidden rounded-full"
              style={{
                height: `${Math.max(3, Math.round(height * WAVE_HEIGHT))}px`,
                backgroundColor: outgoing ? "#a8cfab" : "#c9c3bd",
              }}
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-[#1dab61]"
                style={{ width: `${filled * 100}%` }}
              />
            </span>
          );
        })}
      </button>

      <div className="col-start-2 row-start-2 mt-1 text-[11px] leading-none text-[#7b7673]">
        {formatAudioDuration(started ? elapsed : duration)}
      </div>

      <div className="col-start-3 row-span-2 row-start-1 self-center">
        <div className="relative h-[3.25rem] w-[3.25rem]">
          <span
            className="flex h-full w-full items-center justify-center overflow-hidden rounded-full text-[15px] font-semibold text-white"
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </span>
          {/* Badge microfono: verde finché il vocale non è stato ascoltato. */}
          <span
            className="absolute -left-1 bottom-0 flex h-[20px] w-[20px] items-center justify-center rounded-full"
            style={{
              backgroundColor: bubbleColor,
              color: started ? "#8e8b89" : "#1dab61",
            }}
          >
            <IconMic size={16} />
          </span>
        </div>
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
