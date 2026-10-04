export const TELEPHONY_CATEGORIES = [
  "supporto_montaggio",
  "manuale",
  "pezzo_mancante",
  "integrazione_ordine",
  "ricambio",
  "reso",
  "altro",
] as const;

export type TelephonyCategory = (typeof TELEPHONY_CATEGORIES)[number];

export const TELEPHONY_CATEGORY_LABELS: Record<TelephonyCategory, string> = {
  supporto_montaggio: "Supporto montaggio",
  manuale: "Manuale o documentazione",
  pezzo_mancante: "Pezzo mancante",
  integrazione_ordine: "Integrazione ordine",
  ricambio: "Ricambio",
  reso: "Reso",
  altro: "Altro",
};

export const DEPARTMENTS = ["ufficio_tecnico", "logistica", "commerciale"] as const;

export type DepartmentId = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_LABELS: Record<DepartmentId, string> = {
  ufficio_tecnico: "Ufficio tecnico",
  logistica: "Logistica",
  commerciale: "Commerciale",
};

/** Ricambio va in Logistica. Altro non ha reparto finché l'operatore non lo sceglie. */
export const DEFAULT_CATEGORY_ROUTING: Record<TelephonyCategory, DepartmentId | null> = {
  supporto_montaggio: "ufficio_tecnico",
  manuale: "ufficio_tecnico",
  pezzo_mancante: "logistica",
  integrazione_ordine: "commerciale",
  ricambio: "logistica",
  reso: "commerciale",
  altro: null,
};

export const DEFAULT_CONFIDENCE_THRESHOLD = 0.65;
export const CLASSIFY_TIMEOUT_MS = 12_000;

export type ParsedClassification = {
  category: TelephonyCategory;
  urgency: "normale" | "alta";
  summary: string;
  product: string | null;
  orderNumber: string | null;
  partCodes: string[];
  suggestedAction: string;
  confidence: number;
};

export type CallProposal = ParsedClassification & {
  department: DepartmentId | null;
};

export type OperatorChoice = CallProposal & {
  confirmedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isTelephonyCategory(value: unknown): value is TelephonyCategory {
  return (
    typeof value === "string" &&
    (TELEPHONY_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isDepartmentId(value: unknown): value is DepartmentId {
  return typeof value === "string" && (DEPARTMENTS as readonly string[]).includes(value);
}

function optionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Estrae e valida il JSON di classificazione. Non assegna il reparto. */
export function parseClassification(text: string): ParsedClassification | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;
  if (!isTelephonyCategory(raw.category)) return null;
  if (raw.urgency !== "normale" && raw.urgency !== "alta") return null;
  const summary = optionalText(raw.summary, 400);
  const suggestedAction = optionalText(raw.suggestedAction, 500);
  if (!summary || !suggestedAction) return null;
  if (typeof raw.confidence !== "number" || !Number.isFinite(raw.confidence)) return null;
  if (raw.partCodes != null && !Array.isArray(raw.partCodes)) return null;
  const partCodes = Array.isArray(raw.partCodes)
    ? raw.partCodes
        .filter((code): code is string => typeof code === "string")
        .map((code) => code.trim())
        .filter(Boolean)
        .slice(0, 12)
    : [];
  return {
    category: raw.category,
    urgency: raw.urgency,
    summary,
    product: optionalText(raw.product, 160),
    orderNumber: optionalText(raw.orderNumber, 80),
    partCodes,
    suggestedAction,
    confidence: Math.min(1, Math.max(0, raw.confidence)),
  };
}

export function routingFromSettings(
  settingsJson: unknown
): Record<TelephonyCategory, DepartmentId | null> {
  const routing = { ...DEFAULT_CATEGORY_ROUTING };
  if (!isRecord(settingsJson) || !isRecord(settingsJson.telephonyRouting)) return routing;
  for (const category of TELEPHONY_CATEGORIES) {
    const value = settingsJson.telephonyRouting[category];
    if (value == null) {
      routing[category] = null;
      continue;
    }
    if (isDepartmentId(value)) routing[category] = value;
  }
  return routing;
}

export function confidenceThreshold(settingsJson: unknown): number {
  if (!isRecord(settingsJson)) return DEFAULT_CONFIDENCE_THRESHOLD;
  const value = settingsJson.telephonyConfidence;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_CONFIDENCE_THRESHOLD;
  }
  return Math.min(1, Math.max(0, value));
}

export function withDepartment(
  parsed: ParsedClassification,
  routing: Record<TelephonyCategory, DepartmentId | null>
): CallProposal {
  return { ...parsed, department: routing[parsed.category] };
}

export function isBelowThreshold(confidence: number, threshold: number): boolean {
  return confidence < threshold;
}

/** Conferma operatore: sotto soglia, o senza reparto, lo stato non diventa Assegnato. */
export function statusAfterConfirm(input: {
  currentStatus: string;
  confidence: number;
  threshold: number;
  department: DepartmentId | null;
}): string {
  if (input.currentStatus !== "aperto") return input.currentStatus;
  if (isBelowThreshold(input.confidence, input.threshold)) return input.currentStatus;
  if (!input.department) return input.currentStatus;
  return "assegnato";
}

export function readProposal(value: unknown): CallProposal | null {
  if (!isRecord(value)) return null;
  const parsed = parseClassification(JSON.stringify(value));
  if (!parsed) return null;
  const department = value.department == null ? null : value.department;
  if (department != null && !isDepartmentId(department)) return null;
  return { ...parsed, department };
}

export function readOperatorChoice(value: unknown): OperatorChoice | null {
  const proposal = readProposal(value);
  if (!proposal || !isRecord(value) || typeof value.confirmedAt !== "string") return null;
  return { ...proposal, confirmedAt: value.confirmedAt };
}
