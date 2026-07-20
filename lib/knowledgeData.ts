import type { KnowledgeEntry, ProblemCategory } from "./knowledgeTypes";

export const PROBLEM_CATEGORY_LABELS: Record<ProblemCategory, string> = {
  troubleshooting: "Troubleshooting",
  ricambio: "Ricambio",
  manutenzione: "Manutenzione",
  altro: "Altro",
};

/** Soglia per badge "problema ricorrente" nella vista Manuale. */
export const RECURRING_FREQUENCY_THRESHOLD = 3;

export function newKnowledgeId(): string {
  const n = Math.floor(100 + Math.random() * 900);
  return `KB-${n}`;
}

export const MOCK_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [];

export function formatKnowledgeForPrompt(entries: KnowledgeEntry[]): string {
  if (entries.length === 0) {
    return "=== BASE DI CONOSCENZA TROUBLESHOOTING ===\n(nessuna voce ancora — i ticket chiusi con soluzione la arricchiranno)";
  }
  return entries
    .map((e) => {
      const parts =
        e.spareParts.length > 0
          ? e.spareParts.map((p) => `${p.code}: ${p.description}`).join("; ")
          : "nessuno";
      return [
        `[${e.id}] ${e.machineModel}${e.machineSerial ? ` / ${e.machineSerial}` : ""}`,
        `  Categoria: ${PROBLEM_CATEGORY_LABELS[e.problemCategory]}`,
        `  Sintomo: ${e.symptom}`,
        `  Causa probabile: ${e.probableCause}`,
        `  Soluzione: ${e.solution}`,
        `  Ricambi: ${parts}`,
        `  Frequenza storica: ${e.frequency} occorrenze`,
        `  Tag: ${e.tags.join(", ")}`,
      ].join("\n");
    })
    .join("\n\n")
    .replace(
      /^/,
      "=== BASE DI CONOSCENZA TROUBLESHOOTING (appresa dagli interventi) ===\n"
    );
}
