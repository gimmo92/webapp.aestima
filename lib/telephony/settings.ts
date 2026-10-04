import {
  firstOpenStageId,
  normalizeTicketStages,
} from "@/lib/ticketData";
import type { TicketStage } from "@/lib/ticketTypes";
import type { CallOutcome } from "./types";

export const CALLBACK_STAGE_ID = "da_richiamare";

export const CALLBACK_STAGE: TicketStage = {
  id: CALLBACK_STAGE_ID,
  label: "Da richiamare",
  color: "#ef4444",
  inBoard: true,
  terminal: false,
};

export function isTelephonyEnabled(settingsJson: unknown): boolean {
  if (!settingsJson || typeof settingsJson !== "object" || Array.isArray(settingsJson)) {
    return false;
  }
  const features = (settingsJson as { features?: unknown }).features;
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return false;
  }
  return (features as { telephony?: unknown }).telephony === true;
}

export function withCallbackStage(stages: TicketStage[]): TicketStage[] {
  if (stages.some((stage) => stage.id === CALLBACK_STAGE_ID)) return stages;
  const firstTerminal = stages.findIndex((stage) => stage.terminal);
  if (firstTerminal < 0) return [...stages, CALLBACK_STAGE];
  return [
    ...stages.slice(0, firstTerminal),
    CALLBACK_STAGE,
    ...stages.slice(firstTerminal),
  ];
}

export function stagesFromSettings(settingsJson: unknown): TicketStage[] {
  if (!settingsJson || typeof settingsJson !== "object" || Array.isArray(settingsJson)) {
    return normalizeTicketStages(undefined);
  }
  return normalizeTicketStages(
    (settingsJson as { ticketStages?: unknown }).ticketStages
  );
}

/** Inserisce lo stage solo se manca. Non accende il flag e non tocca le altre chiavi. */
export function settingsWithCallbackStage(
  settingsJson: unknown
): Record<string, unknown> {
  const prev =
    settingsJson && typeof settingsJson === "object" && !Array.isArray(settingsJson)
      ? { ...(settingsJson as Record<string, unknown>) }
      : {};
  return {
    ...prev,
    ticketStages: withCallbackStage(stagesFromSettings(prev)),
  };
}

export function stageForOutcome(
  stages: TicketStage[],
  outcome: CallOutcome
): string {
  if (outcome === "missed" || outcome === "voicemail") return CALLBACK_STAGE_ID;
  const open = stages.find(
    (stage) => !stage.terminal && stage.id !== CALLBACK_STAGE_ID
  );
  return open?.id ?? firstOpenStageId(stages);
}

const OUTCOME_LABEL: Record<CallOutcome, string> = {
  answered: "risposta",
  missed: "persa",
  voicemail: "segreteria",
};

export function ticketDraftForCall(
  event: {
    phone: string;
    direction: "inbound" | "outbound";
    outcome: CallOutcome;
    durationSec: number | null;
    operatorName: string | null;
    transcript: string | null;
  },
  stages: TicketStage[]
): {
  status: string;
  summary: string;
  description: string;
  persistCallbackStage: boolean;
} {
  const callback = event.outcome === "missed" || event.outcome === "voicemail";
  const status = stageForOutcome(stages, event.outcome);
  const direction =
    event.direction === "inbound" ? "in entrata" : "in uscita";
  const duration =
    event.durationSec == null ? "n/d" : `${event.durationSec} s`;
  const lines = [
    `Chiamata ${direction} da ${event.phone}.`,
    `Esito: ${OUTCOME_LABEL[event.outcome]}.`,
    `Durata: ${duration}.`,
    `Operatore: ${event.operatorName?.trim() || "n/d"}.`,
  ];
  if (event.transcript?.trim()) {
    lines.push("", event.transcript.trim());
  }
  return {
    status,
    summary: callback
      ? `Da richiamare · ${event.phone}`
      : `Chiamata da ${event.phone}`,
    description: lines.join("\n"),
    persistCallbackStage:
      callback && !stages.some((stage) => stage.id === CALLBACK_STAGE_ID),
  };
}
