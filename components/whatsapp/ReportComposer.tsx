"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  INTERVENTION_REPORT_OUTCOMES,
  INTERVENTION_REPORT_TYPES,
} from "@/lib/technicianData";
import {
  todayDateLabel,
  type ReportDraft,
  type ReportSourceInput,
} from "@/lib/interventionReportDraft";
import { requestReportDraft } from "@/lib/interventionReportAi";
import {
  nextReportNumber,
  saveReport,
  type InterventionReportRecord,
} from "@/lib/reportsStore";
import { useSpeechDictation } from "@/lib/useSpeechDictation";
import {
  formatAudioDuration,
  formatFileSize,
  type WaChat,
} from "@/lib/whatsappData";
import {
  IconClipboard,
  IconClose,
  IconDocument,
  IconMic,
  IconSparkle,
  IconTrash,
} from "./WaIcons";

type Phase = "sources" | "draft" | "saved";

interface ChatSource extends ReportSourceInput {
  id: string;
  /** Vocale senza trascrizione: utile segnalarlo all'operatore. */
  missingTranscript?: boolean;
}

export interface PanelAudio {
  url: string;
  seconds: number;
  transcript?: string;
}

/** Fonti ricavate dai messaggi della chat: vocali trascritti, testi, documenti. */
function chatSourcesOf(chat: WaChat): ChatSource[] {
  return chat.messages.flatMap((message): ChatSource[] => {
    const who =
      message.direction === "out" ? "operatore" : message.author ?? chat.name;

    if (message.kind === "audio") {
      return [
        {
          id: message.id,
          kind: "audio" as const,
          label: `Vocale ${formatAudioDuration(message.audioSeconds ?? 0)} — ${who} · ${message.timeLabel}`,
          excerpt: message.transcript,
          missingTranscript: !message.transcript,
        },
      ];
    }

    if (message.kind === "document") {
      return [
        {
          id: message.id,
          kind: "documento" as const,
          label: `${message.fileName ?? "Documento"} — ${who} · ${message.timeLabel}`,
        },
      ];
    }

    if (message.kind === "text" && message.text?.trim() && !message.reportRef) {
      return [
        {
          id: message.id,
          kind: "chat" as const,
          label: `Messaggio ${who} · ${message.timeLabel}`,
          excerpt: message.text.trim(),
        },
      ];
    }

    return [];
  });
}

export function ReportComposer({
  chat,
  onClose,
  onSaved,
  onPanelAudio,
}: {
  chat: WaChat;
  onClose: () => void;
  onSaved: (record: InterventionReportRecord) => void;
  /** Il vocale dettato nel pannello viene pubblicato anche in chat. */
  onPanelAudio: (audio: PanelAudio) => void;
}) {
  const chatSources = useMemo(() => chatSourcesOf(chat), [chat]);

  // Di default tutta la chat è selezionata: l'operatore deseleziona il rumore.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(chatSourcesOf(chat).map((source) => source.id))
  );
  const [notes, setNotes] = useState("");
  const [docs, setDocs] = useState<ReportSourceInput[]>([]);
  const [phase, setPhase] = useState<Phase>("sources");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [aiSource, setAiSource] = useState<"anthropic" | "fallback">("fallback");
  const [warning, setWarning] = useState<string | null>(null);
  const [saved, setSaved] = useState<InterventionReportRecord | null>(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [recording, setRecording] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const transcriptRef = useRef("");

  const dictation = useSpeechDictation({
    onTranscript: (text) => {
      transcriptRef.current = text;
      setNotes(text);
    },
  });

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      setRecordSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  function toggleSource(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function startDictation() {
    setWarning(null);
    transcriptRef.current = notes;
    dictation.start(notes);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const seconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        );
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size > 0) {
          onPanelAudio({
            url: URL.createObjectURL(blob),
            seconds,
            transcript: transcriptRef.current.trim() || undefined,
          });
        }
      };
      recorder.start();
      recorderRef.current = recorder;
    } catch {
      // Senza microfono resta comunque la dettatura (o la scrittura manuale).
      recorderRef.current = null;
    }
    startedAtRef.current = Date.now();
    setRecordSeconds(0);
    setRecording(true);
  }

  function stopDictation() {
    dictation.stop();
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    setRecordSeconds(0);
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    Array.from(files).forEach(async (file) => {
      const isText = /^text\/|json|csv/.test(file.type) || /\.(txt|md|csv)$/i.test(file.name);
      const excerpt = isText ? (await file.text()).slice(0, 2000) : undefined;
      setDocs((prev) => [
        ...prev,
        {
          kind: "documento",
          label: `${file.name} (${formatFileSize(file.size)})`,
          excerpt,
        },
      ]);
    });
  }

  /** Fonti allegate: le note viaggiano a parte per non contarle due volte. */
  function attachedSources(): ReportSourceInput[] {
    const fromChat = chatSources
      .filter((source) => selected.has(source.id))
      .map(({ kind, label, excerpt }) => ({ kind, label, excerpt }));
    return [...fromChat, ...docs];
  }

  /** Fonti salvate sul rapporto: includono anche le note dell'operatore. */
  function recordSources(): ReportSourceInput[] {
    const dictated: ReportSourceInput[] = notes.trim()
      ? [
          {
            kind: "testo",
            label: "Note dell'operatore (dettate o scritte)",
            excerpt: notes.trim(),
          },
        ]
      : [];
    return [...dictated, ...attachedSources()];
  }

  async function generate() {
    if (recording) stopDictation();
    const sources = attachedSources();
    if (sources.length === 0 && !notes.trim()) {
      setWarning("Seleziona almeno una fonte oppure scrivi due righe di note.");
      return;
    }
    setLoading(true);
    setWarning(null);
    const result = await requestReportDraft({
      technicianName: chat.name,
      customerCompany: chat.company,
      machineHint: chat.machine,
      notes: notes.trim() || undefined,
      sources,
    });
    setDraft(result.draft);
    setAiSource(result.source);
    setWarning(result.warning ?? null);
    setPhase("draft");
    setLoading(false);
  }

  function save() {
    if (!draft) return;
    const record: InterventionReportRecord = {
      ...draft,
      id: `rep-${Date.now()}`,
      reportNumber: nextReportNumber(),
      createdAtIso: new Date().toISOString(),
      channel: "whatsapp",
      technicianName: chat.name,
      technicianPhone: chat.phone,
      customerCompany: chat.company,
      sources: recordSources(),
      aiSource,
      chatId: chat.id,
      chatName: chat.name,
    };
    saveReport(record);
    setSaved(record);
    setPhase("saved");
    onSaved(record);
  }

  function updateDraft(patch: Partial<ReportDraft>) {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  return (
    <aside className="flex w-[26rem] shrink-0 flex-col border-l border-[#f0ece9] bg-white">
      <header className="flex items-center gap-3 border-b border-[#f0ece9] px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d9fdd3] text-[#1dab61]">
          <IconClipboard size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-tight">
            Rapporto d&apos;intervento
          </p>
          <p className="truncate text-[12px] text-[#7b7673]">
            {chat.name}
            {chat.company ? ` · ${chat.company}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi pannello rapporto"
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#5e5b58] transition hover:bg-black/5"
        >
          <IconClose size={18} />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {phase === "sources" ? (
          <div className="space-y-5">
            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#7b7673]">
                1 · Racconta l&apos;intervento
              </p>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                placeholder="Detta con il microfono o scrivi cosa è stato fatto in campo…"
                className="mt-2 w-full resize-none rounded-lg border border-[#f0ece9] bg-[#f6f5f3] px-3 py-2.5 text-[14px] outline-none focus:border-[#1dab61]"
              />
              <div className="mt-2 flex items-center gap-2">
                {recording ? (
                  <button
                    type="button"
                    onClick={stopDictation}
                    className="inline-flex items-center gap-2 rounded-full bg-[#ea4335] px-3.5 py-2 text-[13px] font-semibold text-white"
                  >
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    Stop · {formatAudioDuration(recordSeconds)}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startDictation}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1dab61] px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-[#199a57]"
                  >
                    <IconMic size={17} />
                    Registra e trascrivi
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f0ece9] px-3.5 py-2 text-[13px] font-semibold text-[#5e5b58] transition hover:bg-[#f6f5f3]"
                >
                  <IconDocument size={17} />
                  Documenti
                </button>
                {notes.trim() ? (
                  <button
                    type="button"
                    onClick={() => setNotes("")}
                    aria-label="Svuota le note"
                    className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-[#8e8b89] transition hover:bg-black/5"
                  >
                    <IconTrash size={17} />
                  </button>
                ) : null}
              </div>
              {recording ? (
                <p className="mt-2 text-[12px] text-[#7b7673]">
                  {dictation.listening
                    ? "Trascrizione in corso: parla pure, il testo compare sopra."
                    : "Registrazione audio in corso. La trascrizione automatica non è disponibile su questo browser."}
                </p>
              ) : null}
              {dictation.error ? (
                <p className="mt-2 text-[12px] text-[#b3261e]">{dictation.error}</p>
              ) : null}
              {docs.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {docs.map((doc, index) => (
                    <li
                      key={`${doc.label}-${index}`}
                      className="flex items-center gap-2 rounded-lg bg-[#f6f5f3] px-3 py-2 text-[13px]"
                    >
                      <IconDocument size={16} className="shrink-0 text-[#5e5b58]" />
                      <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDocs((prev) => prev.filter((_, i) => i !== index))
                        }
                        aria-label={`Rimuovi ${doc.label}`}
                        className="text-[#8e8b89] hover:text-[#b3261e]"
                      >
                        <IconClose size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                multiple
                onChange={(event) => handleFiles(event.target.files)}
                className="hidden"
              />
            </section>

            <section>
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[#7b7673]">
                2 · Fonti dalla chat
              </p>
              <ul className="mt-2 space-y-1.5">
                {chatSources.length === 0 ? (
                  <li className="rounded-lg bg-[#f6f5f3] px-3 py-2 text-[13px] text-[#7b7673]">
                    Nessun messaggio utilizzabile in questa chat.
                  </li>
                ) : (
                  chatSources.map((source) => (
                    <li key={source.id}>
                      <label className="flex cursor-pointer gap-2.5 rounded-lg px-2 py-2 transition hover:bg-[#f6f5f3]">
                        <input
                          type="checkbox"
                          checked={selected.has(source.id)}
                          onChange={() => toggleSource(source.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-[#1dab61]"
                        />
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium leading-snug">
                            {source.label}
                          </span>
                          {source.excerpt ? (
                            <span className="mt-0.5 block line-clamp-2 text-[12.5px] text-[#7b7673]">
                              {source.excerpt}
                            </span>
                          ) : (
                            <span className="mt-0.5 block text-[12.5px] text-[#8e8b89]">
                              {source.missingTranscript
                                ? "Vocale senza trascrizione: verrà citato come allegato."
                                : "Allegato citato nel rapporto."}
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </section>

            {warning ? (
              <p className="rounded-lg bg-[#fdecea] px-3 py-2 text-[12.5px] text-[#b3261e]">
                {warning}
              </p>
            ) : null}
          </div>
        ) : null}

        {phase === "draft" && draft ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#d9fdd3] px-3 py-2 text-[12.5px] text-[#3d7454]">
              <IconSparkle size={16} />
              {aiSource === "anthropic"
                ? "Bozza scritta dall'AI sulle fonti selezionate. Controlla e correggi."
                : "Bozza compilata con regole locali (AI non disponibile). Controlla e correggi."}
            </div>
            {/* Con la bozza locale il banner verde già lo dice: evita il doppione. */}
            {warning && aiSource === "anthropic" ? (
              <p className="rounded-lg bg-[#fff4e5] px-3 py-2 text-[12.5px] text-[#8a5a00]">
                {warning}
              </p>
            ) : null}

            <Field label="Sintesi">
              <input
                value={draft.summary}
                onChange={(event) => updateDraft({ summary: event.target.value })}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Macchina">
                <input
                  value={draft.machineModel}
                  onChange={(event) =>
                    updateDraft({ machineModel: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Matricola">
                <input
                  value={draft.machineSerial ?? ""}
                  onChange={(event) =>
                    updateDraft({ machineSerial: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Data">
                <input
                  value={draft.interventionDate}
                  onChange={(event) =>
                    updateDraft({ interventionDate: event.target.value })
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Tipologia">
                <select
                  value={draft.type}
                  onChange={(event) =>
                    updateDraft({ type: event.target.value as ReportDraft["type"] })
                  }
                  className={inputClass}
                >
                  {INTERVENTION_REPORT_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Ore">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={draft.hours}
                  onChange={(event) =>
                    updateDraft({ hours: Number(event.target.value) })
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Esito">
              <select
                value={draft.outcome}
                onChange={(event) =>
                  updateDraft({
                    outcome: event.target.value as ReportDraft["outcome"],
                  })
                }
                className={inputClass}
              >
                {INTERVENTION_REPORT_OUTCOMES.map((outcome) => (
                  <option key={outcome.id} value={outcome.id}>
                    {outcome.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Lavori eseguiti">
              <textarea
                value={draft.workPerformed}
                onChange={(event) =>
                  updateDraft({ workPerformed: event.target.value })
                }
                rows={7}
                className={`${inputClass} resize-none`}
              />
            </Field>

            <Field label="Ricambi utilizzati (separati da virgola)">
              <input
                value={draft.partsUsed.join(", ")}
                onChange={(event) =>
                  updateDraft({
                    partsUsed: event.target.value
                      .split(",")
                      .map((part) => part.trim())
                      .filter(Boolean),
                  })
                }
                className={inputClass}
              />
            </Field>

            <Field label="Follow-up (opzionale)">
              <textarea
                value={draft.followUp ?? ""}
                onChange={(event) =>
                  updateDraft({ followUp: event.target.value || undefined })
                }
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </Field>
          </div>
        ) : null}

        {phase === "saved" && saved ? (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#d9fdd3] text-[#1dab61]">
              <IconClipboard size={26} />
            </span>
            <div>
              <p className="text-[16px] font-semibold">
                Rapporto {saved.reportNumber} salvato
              </p>
              <p className="mt-1 text-[13px] text-[#7b7673]">
                Lo trovi nella sezione Rapporti, con le fonti usate per scriverlo.
              </p>
            </div>
            <a
              href="/rapporti"
              className="inline-flex items-center gap-2 rounded-full bg-[#1dab61] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#199a57]"
            >
              Apri la sezione Rapporti
            </a>
          </div>
        ) : null}
      </div>

      <footer className="border-t border-[#f0ece9] px-4 py-3">
        {phase === "sources" ? (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#1dab61] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#199a57] disabled:opacity-60"
          >
            <IconSparkle size={18} />
            {loading ? "L'AI sta scrivendo il rapporto…" : "Genera rapporto con AI"}
          </button>
        ) : null}

        {phase === "draft" ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPhase("sources")}
              className="rounded-full border border-[#f0ece9] px-4 py-2.5 text-[14px] font-semibold text-[#5e5b58] transition hover:bg-[#f6f5f3]"
            >
              Indietro
            </button>
            <button
              type="button"
              onClick={save}
              className="flex flex-1 items-center justify-center rounded-full bg-[#1dab61] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-[#199a57]"
            >
              Salva in Rapporti
            </button>
          </div>
        ) : null}

        {phase === "saved" ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-[#f0ece9] px-4 py-2.5 text-[14px] font-semibold text-[#5e5b58] transition hover:bg-[#f6f5f3]"
          >
            Torna alla chat
          </button>
        ) : null}
        <p className="mt-2 text-center text-[11.5px] text-[#8e8b89]">
          Data intervento predefinita: {todayDateLabel()}
        </p>
      </footer>
    </aside>
  );
}

const inputClass =
  "w-full rounded-lg border border-[#f0ece9] bg-[#f6f5f3] px-3 py-2 text-[13.5px] outline-none focus:border-[#1dab61]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-[#7b7673]">
        {label}
      </span>
      {children}
    </label>
  );
}
