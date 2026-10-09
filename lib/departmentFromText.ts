import {
  labelForDepartment,
  type CompanyDepartment,
} from "@/lib/companyDepartments";
import type { TelephonyCategory } from "@/lib/telephony/classify";

const RULES: { category: TelephonyCategory; pattern: RegExp }[] = [
  { category: "reso", pattern: /reso|restitu|sbagliat|errat|non conforme/i },
  {
    category: "pezzo_mancante",
    pattern: /mancant|non (è |e )?arrivat|ddt|collo|spedizion|giacenza/i,
  },
  {
    category: "supporto_montaggio",
    pattern: /montagg|install|fissagg|basamento|piastr|telaio|sequenza/i,
  },
  { category: "manuale", pattern: /manuale|documentaz|istruzion|schema/i },
  {
    category: "integrazione_ordine",
    pattern: /integrazion|conferma ordine|preventiv|listino|offerta|contratto/i,
  },
  {
    category: "ricambio",
    pattern: /ricambio|ventos|sensore|cinghia|codice|pezzo|ricambi/i,
  },
];

const FAULT =
  /guasto|malfunzion|allarme|errore|rumore|plc|fault|non (si )?chiud|blocc/i;

/** Categoria e reparto più plausibili per il testo di un canale. */
export function routeTextToDepartment(
  text: string,
  routing: Record<TelephonyCategory, string | null>
): { category: TelephonyCategory | "troubleshooting"; department: string | null } {
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      return { category: rule.category, department: routing[rule.category] ?? null };
    }
  }
  if (FAULT.test(text)) {
    return {
      category: "troubleshooting",
      department: routing.supporto_montaggio ?? null,
    };
  }
  return { category: "altro", department: routing.altro ?? null };
}

export function assignTicketLabel(
  t: (key: string, vars?: Record<string, string | number>) => string,
  departments: CompanyDepartment[],
  departmentId: string | null | undefined
): string {
  const name = labelForDepartment(departments, departmentId);
  if (!name) return t("tickets.assignTicket");
  return t("tickets.assignToDepartment", { department: name });
}
