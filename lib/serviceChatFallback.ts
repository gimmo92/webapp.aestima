import {
  findKbCandidates,
  isFreeDescriptionIntent,
  isMachineIdentificationOnly,
  isReadyForKbSearch,
  isTicketEscalationIntent,
  machineIdentifiedInHistory,
  userHistoryText,
} from "./knowledgeSearch";
import {
  machineQuickReplies,
  symptomQuickReplies,
} from "./serviceChatQuickReplies";
import { SERVICE_MACHINES, type ServiceMachine } from "./serviceChatData";
import type { KnowledgeEntry } from "./knowledgeTypes";
import type {
  ChatMessage,
  ServiceChatResponse,
  SparePartProposal,
} from "./serviceChatTypes";

// =============================================================
// Fallback deterministico per /api/service-chat
// Usato quando Claude restituisce JSON non valido o vuoto.
// =============================================================

const KB_SEARCH_INTRO =
  "Un attimo, verifico nella knowledge base se questo problema è già stato risolto in passato…";

function findMachineFromMessages(
  messages: ChatMessage[]
): ServiceMachine | undefined {
  const haystack = userHistoryText(messages);
  return SERVICE_MACHINES.find(
    (m) =>
      haystack.includes(m.serial.toLowerCase()) ||
      haystack.includes(m.model.toLowerCase())
  );
}

function spareIntentInHistory(messages: ChatMessage[]): boolean {
  return /ricamb|pezzo|codice|componente|distinta/.test(userHistoryText(messages));
}

function malfunctionIntentInHistory(messages: ChatMessage[]): boolean {
  return /malfunzion|non funziona|problema|guasto|errore|sintom/.test(
    userHistoryText(messages)
  );
}

function partQuickReplies(machine: ServiceMachine) {
  return machine.parts.slice(0, 4).map((p) => ({
    label:
      p.description.length > 42
        ? `${p.description.slice(0, 39)}…`
        : p.description,
    value: `Mi serve: ${p.description} (cod. ${p.code})`,
  }));
}

function toSparePartProposal(
  part: ServiceMachine["parts"][number]
): SparePartProposal {
  return {
    code: part.code,
    description: part.description,
    price: part.price,
    availability: part.stock > 0 ? "disponibile" : "da_ordinare",
    leadTimeDays: part.stock > 0 ? undefined : part.leadTimeDays,
  };
}

function findPartInMachine(
  machine: ServiceMachine,
  query: string
): ServiceMachine["parts"][number] | undefined {
  const q = query.toLowerCase().trim();
  if (!q) return undefined;

  return machine.parts.find((p) => {
    if (p.code.toLowerCase().includes(q)) return true;
    if (p.description.toLowerCase().includes(q)) return true;
    return p.keywords.some(
      (k) => q.includes(k.toLowerCase()) || k.toLowerCase().includes(q)
    );
  });
}

function generateTicketId(): string {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `SRV-${n}`;
}

function askMachineMessage(sparePartFocus = true): ServiceChatResponse {
  return {
    message: sparePartFocus
      ? "Per cercare il ricambio corretto nella distinta tecnica, ho bisogno di identificare la macchina. Puoi indicarmi il modello o la matricola dell'impianto?"
      : "Per indirizzarti al meglio, puoi indicarmi il modello o la matricola dell'impianto?",
    quickReplies: machineQuickReplies(),
    source: "fallback",
  };
}

function freeDescriptionMessage(): ServiceChatResponse {
  return {
    message:
      "Certo, puoi descrivere liberamente la tua richiesta: ricambio, malfunzionamento o qualsiasi altra necessità.\n\nSe conosci modello o matricola dell'impianto, indicameli — altrimenti procedi pure con la descrizione del problema.",
    quickReplies: machineQuickReplies(),
    source: "fallback",
  };
}

function askSparePartMessage(machine: ServiceMachine): ServiceChatResponse {
  return {
    message: `Perfetto, ho identificato l'impianto ${machine.model} (matricola ${machine.serial}).\n\nQuale ricambio ti serve? Puoi indicare il codice, una descrizione o scegliere tra i componenti più richiesti per questo impianto.`,
    quickReplies: partQuickReplies(machine),
    source: "fallback",
  };
}

function askSymptomMessage(machine: ServiceMachine): ServiceChatResponse {
  return {
    message: `Ho registrato l'impianto ${machine.model} (matricola ${machine.serial}).\n\nPer aiutarti, descrivi il malfunzionamento: sintomi, messaggi di errore o comportamento anomalo.`,
    quickReplies: symptomQuickReplies().slice(0, 4),
    source: "fallback",
  };
}

function buildKbFallback(
  entry: KnowledgeEntry,
  knowledgeBase: KnowledgeEntry[]
): ServiceChatResponse {
  const full = knowledgeBase.find((e) => e.id === entry.id) ?? entry;
  return {
    message: `${KB_SEARCH_INTRO}\n\nHo trovato un caso simile già risolto (${full.id}): ${full.symptom}\n\nCausa probabile: ${full.probableCause}\n\nSoluzione: ${full.solution}${
      full.spareParts?.length
        ? `\n\nRicambi coinvolti: ${full.spareParts.map((p) => `${p.code} — ${p.description}`).join("; ")}.`
        : ""
    }`,
    kbMatch: {
      entryId: full.id,
      symptom: full.symptom.slice(0, 100),
      frequency: full.frequency,
    },
    kbSearching: true,
    source: "fallback",
  };
}

export function buildServiceChatFallback(
  messages: ChatMessage[],
  knowledgeBase: KnowledgeEntry[]
): ServiceChatResponse {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserText = lastUser?.content?.trim() ?? "";
  const machine = findMachineFromMessages(messages);
  const recentContext = messages
    .slice(-6)
    .map((m) => m.content)
    .join(" ");

  if (lastUser && isFreeDescriptionIntent(lastUserText)) {
    return freeDescriptionMessage();
  }

  if (lastUser && isTicketEscalationIntent(messages, lastUserText)) {
    const ticketId = generateTicketId();
    const summary =
      lastUserText
        .replace(/^(apri(re)?|crea(re)?)\s+(un\s+)?ticket\s*/i, "")
        .trim() || lastUserText.slice(0, 120);
    return {
      message: `Ho aperto il ticket ${ticketId} per il team tecnico. Riceverai aggiornamenti non appena un operatore prenderà in carico la richiesta.`,
      ticket: { id: ticketId, summary },
      source: "fallback",
    };
  }

  if (
    lastUser &&
    isReadyForKbSearch(messages, lastUserText) &&
    machine
  ) {
    const candidates = findKbCandidates(
      knowledgeBase,
      lastUserText,
      recentContext
    );
    if (candidates.length > 0) {
      return buildKbFallback(candidates[0], knowledgeBase);
    }
    return {
      message: `${KB_SEARCH_INTRO}\n\nNon ho trovato un caso analogo nella knowledge base per ${machine.model} (${machine.serial}). Posso aprire un ticket per il team tecnico?`,
      quickReplies: [
        { label: "Sì, apri ticket", value: "Sì, apri un ticket" },
        { label: "Aggiungo altri dettagli", value: "Aggiungo altri dettagli sul guasto" },
      ],
      source: "fallback",
    };
  }

  if (
    lastUser &&
    machine &&
    isMachineIdentificationOnly(lastUserText)
  ) {
    if (spareIntentInHistory(messages) && !malfunctionIntentInHistory(messages)) {
      return askSparePartMessage(machine);
    }
    if (malfunctionIntentInHistory(messages)) {
      return askSymptomMessage(machine);
    }
    return {
      message: `Ho identificato l'impianto ${machine.model} (matricola ${machine.serial}). Cerchi un ricambio o hai un malfunzionamento da segnalare?`,
      quickReplies: [
        { label: "Cerco un ricambio", value: "Cerco un ricambio per questo impianto" },
        {
          label: "Ho un malfunzionamento",
          value: "Ho un malfunzionamento su questo impianto",
        },
      ],
      source: "fallback",
    };
  }

  if (lastUser && machine && spareIntentInHistory(messages)) {
    const part = findPartInMachine(machine, lastUserText);
    if (part) {
      const proposal = toSparePartProposal(part);
      const avail =
        proposal.availability === "disponibile"
          ? "disponibile a magazzino"
          : `da ordinare (consegna stimata ${proposal.leadTimeDays ?? "?"} gg lavorativi)`;
      return {
        message: `Per ${machine.model} (${machine.serial}) in distinta risulta:\n\n• ${part.code} — ${part.description}\n• Prezzo listino €${part.price.toFixed(2)}\n• Disponibilità: ${avail}\n\nVuoi che prepari un preventivo o cerchi un altro componente?`,
        spareParts: [proposal],
        quickReplies: [
          { label: "Sì, preventivo", value: "Sì, prepara il preventivo per questo ricambio" },
          { label: "Altro ricambio", value: "Cerco un altro ricambio" },
        ],
        source: "fallback",
      };
    }
    if (!machineIdentifiedInHistory(messages)) {
      return askMachineMessage(true);
    }
    return askSparePartMessage(machine);
  }

  if (!machineIdentifiedInHistory(messages)) {
    const spareFocus = spareIntentInHistory(messages);
    return askMachineMessage(spareFocus);
  }

  if (machine) {
    return {
      message: `Ho registrato l'impianto ${machine.model} (matricola ${machine.serial}). Come posso aiutarti?`,
      quickReplies: [
        { label: "Cerco un ricambio", value: "Cerco un ricambio" },
        { label: "Ho un malfunzionamento", value: "Ho un malfunzionamento" },
      ],
      source: "fallback",
    };
  }

  return {
    message:
      "Non sono riuscito a elaborare la risposta. Puoi riformulare la richiesta indicando matricola dell'impianto e il ricambio o il problema riscontrato?",
    quickReplies: machineQuickReplies(),
    source: "fallback",
  };
}
