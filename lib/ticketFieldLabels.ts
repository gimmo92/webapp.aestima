export type TicketFieldLabels = {
  machineModel: string;
  machineSerial: string;
};

export const DEFAULT_TICKET_FIELD_LABELS: TicketFieldLabels = {
  machineModel: "Macchina",
  machineSerial: "Matricola",
};

function cleanLabel(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, 40);
  return trimmed || fallback;
}

/** Etichette di prodotto e commessa. Assenti o vuote = Macchina e Matricola. */
export function ticketFieldLabelsFromSettings(
  settingsJson: unknown
): TicketFieldLabels {
  if (
    !settingsJson ||
    typeof settingsJson !== "object" ||
    Array.isArray(settingsJson)
  ) {
    return { ...DEFAULT_TICKET_FIELD_LABELS };
  }
  const raw = (settingsJson as Record<string, unknown>).ticketFieldLabels;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_TICKET_FIELD_LABELS };
  }
  const row = raw as Record<string, unknown>;
  return {
    machineModel: cleanLabel(
      row.machineModel,
      DEFAULT_TICKET_FIELD_LABELS.machineModel
    ),
    machineSerial: cleanLabel(
      row.machineSerial,
      DEFAULT_TICKET_FIELD_LABELS.machineSerial
    ),
  };
}
