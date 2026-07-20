"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATUSES } from "@/lib/inboxData";
import {
  buildTechnicianAvailabilityRequest,
  buildTechnicianSubject,
} from "@/lib/inboxDrafts";
import type { Label, PartRequest, RequestStatus } from "@/lib/inboxTypes";
import { CURRENT_OPERATOR } from "@/lib/conversationData";
import { LabelChip } from "./LabelChip";
import { StatusPill } from "./StatusPill";
import { AgentPanel } from "./AgentPanel";
import { useInbox } from "./InboxProvider";
import { TechnicianPickerModal } from "@/components/technicians/TechnicianPickerModal";
import { TechnicianAssignmentStatusPill } from "@/components/technicians/TechnicianBadges";
import { TechnicianContactButtons } from "@/components/technicians/TechnicianContactButtons";

// COLONNA DESTRA — dettaglio richiesta + pannello agente aestima.

interface Props {
  request: PartRequest | null;
  labels: Label[];
  onChangeStatus: (id: string, status: RequestStatus) => void;
  onToggleLabel: (id: string, labelId: string) => void;
  onCreateLabel: (name: string) => string;
}

type OpenMenu = "status" | "label" | "more" | null;

export function RequestDetail({
  request,
  labels,
  onChangeStatus,
  onToggleLabel,
  onCreateLabel,
}: Props) {
  const router = useRouter();
  const {
    technicians,
    createTechnicianAssignment,
    getTechnicianAssignmentForRequest,
    updateTechnicianAssignmentStatus,
    createConversation,
  } = useInbox();
  const [menu, setMenu] = useState<OpenMenu>(null);
  const [newLabel, setNewLabel] = useState("");
  const [showTechnicianPicker, setShowTechnicianPicker] = useState(false);
  // Lightbox per l'allegato foto (url dell'immagine ingrandita).
  const [lightbox, setLightbox] = useState<string | null>(null);

  const assignment = useMemo(
    () => (request ? getTechnicianAssignmentForRequest(request.id) : undefined),
    [request, getTechnicianAssignmentForRequest]
  );
  const assignedTech = useMemo(
    () => technicians.find((t) => t.id === assignment?.technicianId),
    [technicians, assignment?.technicianId]
  );

  const technicianSubject = request
    ? buildTechnicianSubject(request, assignment?.componentCode)
    : "";
  const technicianBody = request
    ? (assignment?.body ??
      buildTechnicianAvailabilityRequest(request, {
        machineModel: assignment?.machineModel,
        machineSerial: assignment?.machineSerial,
        componentCode: assignment?.componentCode,
        componentDescription: assignment?.componentDescription,
      }))
    : "";

  // Chiudi il lightbox se cambia la richiesta selezionata.
  useEffect(() => {
    setLightbox(null);
  }, [request?.id]);

  const handleCreateTicket = () => {
    if (!request) return;
    const timestampLabel = new Date().toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const emailContent = [
      `Oggetto: ${request.subject}`,
      `Da: ${request.from} <${request.fromEmail}>`,
      `Azienda: ${request.company}`,
      `Ricevuta: ${request.receivedFull}`,
      "",
      request.body,
    ].join("\n");

    const id = createConversation({
      customerName: request.from,
      customerEmail: request.fromEmail,
      channel: "inbox",
      assignee: "operatore",
      assignedOperatorId: CURRENT_OPERATOR.id,
      initialMessages: [
        {
          id: `msg-inbox-${Date.now()}`,
          role: "user",
          content: emailContent,
          timestampLabel,
        },
      ],
    });
    router.push(`/conversazioni?id=${encodeURIComponent(id)}`);
  };

  if (!request) {
    return (
      <section className="hidden flex-1 items-center justify-center bg-surface/30 lg:flex">
        <div className="max-w-xs text-center text-sm text-ink-faint">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-border bg-surface">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-ink-faint">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          Seleziona una richiesta per vederne il dettaglio e l&apos;analisi
          dell&apos;agente.
        </div>
      </section>
    );
  }

  const appliedLabels = labels.filter((l) => request.labelIds.includes(l.id));

  const handleCreateLabel = () => {
    const name = newLabel.trim();
    if (!name) return;
    const id = onCreateLabel(name);
    onToggleLabel(request.id, id);
    setNewLabel("");
  };

  return (
    <section className="relative flex h-full min-w-0 flex-1 flex-col bg-surface/30">
      {/* backdrop per chiudere i menu */}
      {menu && (
        <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} />
      )}

      {/* Header */}
      <div className="border-b border-border bg-surface/60 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-ink">
              {request.subject}
            </h2>
            <p className="mt-0.5 text-sm text-ink-muted">
              <span className="font-medium text-ink">{request.from}</span> ·{" "}
              {request.company}
            </p>
            <p className="text-xs text-ink-faint">
              {request.fromEmail} · {request.receivedFull}
            </p>
          </div>

          {/* Dropdown stato */}
          <div className="relative z-20 shrink-0">
            <button
              onClick={() => setMenu(menu === "status" ? null : "status")}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-base px-2.5 py-1.5 transition-colors hover:border-border-strong"
            >
              <StatusPill status={request.status} />
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="text-ink-faint">
                <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {menu === "status" && (
              <div className="absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-border bg-surface p-1.5 shadow-2xl shadow-black/50">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Sposta nello stato
                </p>
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      onChangeStatus(request.id, s.id);
                      setMenu(null);
                    }}
                    className={[
                      "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2",
                      s.id === request.status ? "bg-surface-2" : "",
                    ].join(" ")}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="flex-1 text-ink">{s.label}</span>
                    {s.id === request.status && (
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-brand">
                        <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Azioni + etichette applicate */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ActionButton
            label="Sposta"
            onClick={() => setMenu(menu === "status" ? null : "status")}
            icon={
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            }
          />

          {/* Menu etichette */}
          <div className="relative z-20">
            <ActionButton
              label="Etichetta"
              onClick={() => setMenu(menu === "label" ? null : "label")}
              icon={
                <path d="M3 8v8a2 2 0 0 0 2 2h11l4-6-4-6H5a2 2 0 0 0-2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              }
            />
            {menu === "label" && (
              <div className="absolute left-0 top-full z-30 mt-1 w-64 rounded-xl border border-border bg-surface p-2 shadow-2xl shadow-black/50">
                <p className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                  Applica etichette
                </p>
                <div className="max-h-52 overflow-y-auto">
                  {labels.map((l) => {
                    const on = request.labelIds.includes(l.id);
                    return (
                      <button
                        key={l.id}
                        onClick={() => onToggleLabel(request.id, l.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-surface-2"
                      >
                        <span
                          className={[
                            "flex h-4 w-4 items-center justify-center rounded border",
                            on ? "border-transparent" : "border-border-strong",
                          ].join(" ")}
                          style={on ? { backgroundColor: l.color } : undefined}
                        >
                          {on && (
                            <svg width="11" height="11" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-white">
                              <path d="M4 10.5 8 14.5 16 5.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                        <span className="text-ink">{l.name}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Crea nuova etichetta */}
                <div className="mt-1 flex gap-1.5 border-t border-border pt-2">
                  <input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateLabel()}
                    placeholder="Nuova etichetta…"
                    className="min-w-0 flex-1 rounded-md border border-border bg-base px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-brand"
                  />
                  <button
                    onClick={handleCreateLabel}
                    disabled={!newLabel.trim()}
                    className="rounded-md bg-brand px-2.5 py-1 text-sm font-medium text-white transition-colors hover:bg-brand-strong disabled:opacity-40"
                  >
                    Crea
                  </button>
                </div>
              </div>
            )}
          </div>

          <ActionButton
            label="Tecnico"
            onClick={() => setShowTechnicianPicker(true)}
            icon={
              <path
                d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            }
          />

          {/* Menu "Altro" (azioni dimostrative) */}
          <div className="relative z-20">
            <ActionButton
              label="Altro"
              onClick={() => setMenu(menu === "more" ? null : "more")}
              icon={
                <>
                  <circle cx="5" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.6" fill="currentColor" />
                  <circle cx="19" cy="12" r="1.6" fill="currentColor" />
                </>
              }
            />
            {menu === "more" && (
              <div className="absolute left-0 top-full z-30 mt-1 w-48 rounded-xl border border-border bg-surface p-1.5 shadow-2xl shadow-black/50 text-sm text-ink-muted">
                <div className="cursor-default rounded-lg px-2 py-1.5 hover:bg-surface-2">Segna come letta</div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTechnicianPicker(true);
                    setMenu(null);
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-surface-2"
                >
                  Assegna a tecnico
                </button>
                <div className="cursor-default rounded-lg px-2 py-1.5 hover:bg-surface-2">Archivia</div>
              </div>
            )}
          </div>

          <ActionButton
            label="Crea ticket"
            onClick={handleCreateTicket}
            icon={
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            }
          />

          {assignment && assignedTech && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-base/80 px-2.5 py-1.5">
              <TechnicianAssignmentStatusPill status={assignment.status} compact />
              <span className="text-xs text-ink-muted">
                <span className="font-medium text-ink">{assignedTech.name}</span>
              </span>
              <TechnicianContactButtons
                technician={assignedTech}
                subject={assignment.subject}
                body={assignment.body}
                compact
                onContact={() =>
                  updateTechnicianAssignmentStatus(assignment.id, "contattato")
                }
              />
              <Link
                href="/tecnici"
                className="text-[11px] font-medium text-brand hover:underline"
              >
                Vedi in Tecnici
              </Link>
            </div>
          )}

          {appliedLabels.length > 0 && (
            <div className="ml-1 flex flex-wrap items-center gap-1">
              {appliedLabels.map((l) => (
                <LabelChip
                  key={l.id}
                  label={l}
                  onRemove={() => onToggleLabel(request.id, l.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Corpo scrollabile */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Email originale */}
        <article className="rounded-xl border border-border bg-base/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs text-ink-faint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.7" />
              <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Email del cliente
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-muted">
            {request.body}
          </p>

          {/* Allegati (es. foto del componente inviata dal cliente) */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs text-ink-faint">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 18.4a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {request.attachments.length}{" "}
                {request.attachments.length === 1 ? "allegato" : "allegati"}
              </div>
              <div className="flex flex-wrap gap-3">
                {request.attachments.map((att) => (
                  <button
                    key={att.url}
                    onClick={() => setLightbox(att.url)}
                    className="group w-44 overflow-hidden rounded-lg border border-border bg-base text-left transition-colors hover:border-brand/60"
                    title="Apri l'immagine"
                  >
                    <span className="relative block h-28 w-full overflow-hidden bg-surface-2">
                      <Image
                        src={att.url}
                        alt={att.name}
                        fill
                        sizes="176px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-brand">
                        <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.7" />
                        <circle cx="8.5" cy="9.5" r="1.5" fill="currentColor" />
                        <path d="m4 17 5-5 4 4 3-3 4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="truncate text-xs text-ink-muted group-hover:text-ink">
                        {att.name}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Pannello agente (analisi + bozze) */}
        <AgentPanel
          request={request}
          onApproveSend={() => onChangeStatus(request.id, "inviata")}
        />
      </div>

      {/* Lightbox allegato */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setLightbox(null);
          }}
        >
          <div className="flex shrink-0 justify-end p-3">
            <button
              onClick={() => setLightbox(null)}
              aria-label="Chiudi immagine"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <Image
              src={lightbox}
              alt="Allegato richiesta"
              fill
              sizes="100vw"
              className="object-contain p-4 pt-0"
            />
          </div>
        </div>
      )}

      {showTechnicianPicker && request && (
        <TechnicianPickerModal
          request={request}
          subject={technicianSubject}
          body={technicianBody}
          machineModel={assignment?.machineModel}
          machineSerial={assignment?.machineSerial}
          componentCode={assignment?.componentCode}
          componentDescription={assignment?.componentDescription}
          onClose={() => setShowTechnicianPicker(false)}
          onAssign={(technicianId, contacted) => {
            createTechnicianAssignment({
              partRequestId: request.id,
              technicianId,
              subject: technicianSubject,
              body: technicianBody,
              machineModel: assignment?.machineModel,
              machineSerial: assignment?.machineSerial,
              componentCode: assignment?.componentCode,
              componentDescription: assignment?.componentDescription,
              contacted,
            });
            setShowTechnicianPicker(false);
          }}
        />
      )}
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-base px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        {icon}
      </svg>
      {label}
    </button>
  );
}
