export type TicketFormFieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "files";

export type TicketFormField = {
  id: string;
  key: string;
  label: string;
  type: TicketFormFieldType;
  enabled: boolean;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  builtIn?: boolean;
};

export type TicketFormConfig = {
  title: string;
  intro: string;
  fields: TicketFormField[];
};

const TYPES: TicketFormFieldType[] = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "files",
];

export const DEFAULT_TICKET_FORM: TicketFormConfig = {
  title: "Apri un ticket",
  intro:
    "Segnala un guasto, un ricambio o una richiesta di assistenza. Puoi allegare foto e documenti.",
  fields: [
    {
      id: "customerName",
      key: "customerName",
      label: "Nome e cognome",
      type: "text",
      enabled: true,
      required: true,
      builtIn: true,
    },
    {
      id: "customerEmail",
      key: "customerEmail",
      label: "Email",
      type: "email",
      enabled: true,
      required: true,
      builtIn: true,
    },
    {
      id: "customerPhone",
      key: "customerPhone",
      label: "Telefono",
      type: "tel",
      enabled: true,
      required: false,
      placeholder: "+39 …",
      builtIn: true,
    },
    {
      id: "customerCompany",
      key: "customerCompany",
      label: "Azienda",
      type: "text",
      enabled: true,
      required: false,
      builtIn: true,
    },
    {
      id: "summary",
      key: "summary",
      label: "Oggetto",
      type: "text",
      enabled: true,
      required: true,
      placeholder: "Es. Rumore sul gruppo spinta",
      builtIn: true,
    },
    {
      id: "description",
      key: "description",
      label: "Descrizione",
      type: "textarea",
      enabled: true,
      required: true,
      placeholder: "Cosa succede, da quando, eventuali allarmi o codici errore…",
      builtIn: true,
    },
    {
      id: "machineModel",
      key: "machineModel",
      label: "Modello macchina",
      type: "text",
      enabled: true,
      required: false,
      builtIn: true,
    },
    {
      id: "machineSerial",
      key: "machineSerial",
      label: "Matricola",
      type: "text",
      enabled: true,
      required: false,
      builtIn: true,
    },
    {
      id: "category",
      key: "category",
      label: "Categoria",
      type: "select",
      enabled: true,
      required: false,
      builtIn: true,
      options: [
        { value: "ricambio", label: "Ricambio" },
        { value: "troubleshooting", label: "Guasto / troubleshooting" },
        { value: "altro", label: "Altro" },
      ],
    },
    {
      id: "priority",
      key: "priority",
      label: "Urgenza",
      type: "select",
      enabled: true,
      required: false,
      builtIn: true,
      options: [
        { value: "normale", label: "Normale" },
        { value: "alta", label: "Alta" },
      ],
    },
    {
      id: "attachments",
      key: "attachments",
      label: "Foto e documenti",
      type: "files",
      enabled: true,
      required: false,
      builtIn: true,
    },
  ],
};

function isType(v: unknown): v is TicketFormFieldType {
  return typeof v === "string" && TYPES.includes(v as TicketFormFieldType);
}

export function newCustomFieldId() {
  return `custom_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`;
}

export function normalizeTicketForm(raw: unknown): TicketFormConfig {
  const base = DEFAULT_TICKET_FORM;
  const input =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const title = typeof input.title === "string" ? input.title : base.title;
  const intro = typeof input.intro === "string" ? input.intro : base.intro;

  const saved = Array.isArray(input.fields) ? input.fields : [];
  const byId = new Map<string, TicketFormField>();

  for (const item of saved) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = String(o.id ?? o.key ?? "").trim();
    const key = String(o.key ?? id).trim();
    if (!id || !key) continue;
    const builtin = base.fields.find((f) => f.id === id || f.key === key);
    const label = typeof o.label === "string" ? o.label : builtin?.label ?? key;
    const type = isType(o.type) ? o.type : builtin?.type ?? "text";
    const options = Array.isArray(o.options)
      ? o.options
          .map((opt) => {
            if (!opt || typeof opt !== "object") return null;
            const v = String((opt as { value?: unknown }).value ?? "").trim();
            const l = String((opt as { label?: unknown }).label ?? v).trim();
            return v ? { value: v, label: l || v } : null;
          })
          .filter((x): x is { value: string; label: string } => Boolean(x))
      : builtin?.options;
    byId.set(id, {
      id,
      key: builtin?.key ?? key,
      label,
      type: builtin?.type ?? type,
      enabled: o.enabled !== false,
      required: Boolean(o.required),
      placeholder:
        typeof o.placeholder === "string" ? o.placeholder : builtin?.placeholder,
      options: options && options.length ? options : builtin?.options,
      builtIn: Boolean(builtin),
    });
  }

  const fields: TicketFormField[] = [];
  const seen = new Set<string>();
  for (const item of saved) {
    if (!item || typeof item !== "object") continue;
    const id = String((item as { id?: unknown; key?: unknown }).id ?? (item as { key?: unknown }).key ?? "");
    const field = byId.get(id);
    if (!field || seen.has(field.id)) continue;
    seen.add(field.id);
    fields.push(field);
  }
  for (const def of base.fields) {
    if (seen.has(def.id)) continue;
    fields.push(def);
    seen.add(def.id);
  }

  const hasContent = fields.some(
    (f) => f.enabled && (f.key === "summary" || f.key === "description")
  );
  if (!hasContent) {
    const summary = fields.find((f) => f.key === "summary");
    if (summary) {
      summary.enabled = true;
      summary.required = true;
    }
  }

  return { title, intro, fields };
}

export function fieldByKey(config: TicketFormConfig, key: string) {
  return config.fields.find((f) => f.key === key);
}
