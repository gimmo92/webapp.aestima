import type { ProblemCategory } from "./knowledgeTypes";

export type ChatKnowledgeMessage = {
  role: string;
  content: string;
};

export type ExtractedChatKnowledge = {
  machineModel: string;
  machineSerial?: string;
  problemCategory: ProblemCategory;
  symptom: string;
  probableCause: string;
  solution: string;
  spareParts: { code: string; description: string }[];
  tags: string[];
};

function lastOfRole(
  messages: ChatKnowledgeMessage[],
  roles: string[]
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (roles.includes(messages[i].role) && messages[i].content.trim()) {
      return messages[i].content.trim();
    }
  }
  return undefined;
}

export function buildChatSummary(messages: ChatKnowledgeMessage[]): string {
  const lastUser = lastOfRole(messages, ["user"]) ?? "Richiesta assistenza";
  return lastUser.length > 90 ? `${lastUser.slice(0, 87).trim()}…` : lastUser;
}

export function buildChatSolutionText(messages: ChatKnowledgeMessage[]): string {
  const helper = lastOfRole(messages, ["assistant", "agent"]);
  if (helper) return helper;
  return lastOfRole(messages, ["user"]) ?? "";
}

function coerceCategory(raw: string | undefined): ProblemCategory {
  const v = (raw ?? "").toLowerCase();
  if (v === "ricambio" || v === "manutenzione" || v === "altro") return v;
  return "troubleshooting";
}

function localFallback(
  messages: ChatKnowledgeMessage[],
  machineModel?: string,
  machineSerial?: string
): ExtractedChatKnowledge {
  return {
    machineModel: machineModel?.trim() || "Impianto non specificato",
    machineSerial: machineSerial?.trim() || undefined,
    problemCategory: "troubleshooting",
    symptom: buildChatSummary(messages),
    probableCause: "Causa da confermare — estrazione automatica non disponibile.",
    solution: buildChatSolutionText(messages) || buildChatSummary(messages),
    spareParts: [],
    tags: ["chat", "assistenza"],
  };
}

function normalizeEntry(
  raw: Partial<ExtractedChatKnowledge> & { problemCategory?: string },
  fallback: ExtractedChatKnowledge
): ExtractedChatKnowledge {
  const spareParts = Array.isArray(raw.spareParts)
    ? raw.spareParts
        .map((p) => ({
          code: String(p.code ?? "").trim(),
          description: String(p.description ?? "").trim(),
        }))
        .filter((p) => p.code || p.description)
    : [];
  return {
    machineModel: raw.machineModel?.trim() || fallback.machineModel,
    machineSerial: raw.machineSerial?.trim() || fallback.machineSerial,
    problemCategory: coerceCategory(raw.problemCategory),
    symptom: raw.symptom?.trim() || fallback.symptom,
    probableCause: raw.probableCause?.trim() || fallback.probableCause,
    solution: raw.solution?.trim() || fallback.solution,
    spareParts,
    tags: Array.isArray(raw.tags)
      ? [...new Set([...raw.tags.map((t) => String(t).trim()).filter(Boolean), "chat"])]
      : fallback.tags,
  };
}

/** Estrae una scheda Manuale dalla chat assistenza (AI + fallback locale). */
export async function extractKnowledgeFromChat(opts: {
  conversationId: string;
  messages: ChatKnowledgeMessage[];
  machineModel?: string;
  machineSerial?: string;
}): Promise<{ entry: ExtractedChatKnowledge; source: "anthropic" | "fallback" }> {
  const fallback = localFallback(
    opts.messages,
    opts.machineModel,
    opts.machineSerial
  );
  const solution = fallback.solution;
  if (!solution) {
    return { entry: fallback, source: "fallback" };
  }

  const conversationContext = opts.messages
    .filter((m) => ["user", "assistant", "agent"].includes(m.role))
    .slice(-16)
    .map((m) => {
      const who =
        m.role === "user"
          ? "Cliente"
          : m.role === "agent"
            ? "Operatore"
            : "AI";
      return `[${who}] ${m.content}`;
    })
    .join("\n");

  try {
    const res = await fetch("/api/knowledge-extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ticketId: opts.conversationId,
        summary: buildChatSummary(opts.messages),
        description: conversationContext,
        solution,
        machineModel: opts.machineModel,
        machineSerial: opts.machineSerial,
        conversationContext,
      }),
    });
    const data = (await res.json()) as {
      entry?: Partial<ExtractedChatKnowledge>;
      fallback?: Partial<ExtractedChatKnowledge>;
    };
    const extracted = data.entry ?? data.fallback;
    if (extracted?.symptom || extracted?.solution) {
      return {
        entry: normalizeEntry(extracted, fallback),
        source: data.entry ? "anthropic" : "fallback",
      };
    }
  } catch {
    // fallback locale
  }

  return { entry: fallback, source: "fallback" };
}
