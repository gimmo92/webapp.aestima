import type { Label, PartRequest, StatusConfig } from "./inboxTypes";

/** Configurazione degli 8 stati, con colore e descrizione. */
export const STATUSES: StatusConfig[] = [
  {
    id: "nuova",
    label: "Nuova",
    color: "#3b82f6",
    description: "Appena arrivata, da lavorare",
  },
  {
    id: "da_identificare",
    label: "Da identificare",
    color: "#f59e0b",
    description: "Manca la matricola o il componente non è chiaro",
  },
  {
    id: "identificata",
    label: "Identificata",
    color: "#a855f7",
    description: "Macchina e ricambio riconosciuti",
  },
  {
    id: "preventivo_pronto",
    label: "Preventivo pronto",
    color: "#06b6d4",
    description: "Bozza di offerta pronta da approvare",
  },
  {
    id: "inviata",
    label: "Inviata al cliente",
    color: "#6366f1",
    description: "Offerta approvata e inviata",
  },
  {
    id: "attesa_fornitore",
    label: "In attesa fornitore",
    color: "#f97316",
    description: "Pezzo mancante: richiesta al fornitore",
  },
  {
    id: "vinta",
    label: "Chiusa / Vinta",
    color: "#22c55e",
    description: "Ordine confermato dal cliente",
  },
  {
    id: "persa",
    label: "Persa",
    color: "#ef4444",
    description: "Cliente non ha dato seguito",
  },
];

/** Mappa rapida id → configurazione stato. */
export const STATUS_BY_ID: Record<string, StatusConfig> = Object.fromEntries(
  STATUSES.map((s) => [s.id, s])
);

/** Etichette iniziali (vuoto: le crei tu). */
export const DEFAULT_LABELS: Label[] = [];

/** Palette usata per assegnare un colore alle etichette create ex novo. */
export const LABEL_PALETTE = [
  "#ef4444",
  "#a855f7",
  "#06b6d4",
  "#f59e0b",
  "#22c55e",
  "#6366f1",
  "#ec4899",
  "#14b8a6",
];

/** Richieste inbox (vuoto: le crei tu / arrivano da email). */
export const MOCK_REQUESTS: PartRequest[] = [];
