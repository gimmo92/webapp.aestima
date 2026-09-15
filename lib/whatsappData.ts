// =============================================================
// DATI MOCK — canale WhatsApp assistenza macchinari
// Richieste inviate dai tecnici di campo / manutentori clienti.
// =============================================================

export type WaDirection = "in" | "out";

export type WaMessageKind = "text" | "image" | "document" | "audio";

export type WaMessageStatus = "sent" | "delivered" | "read";

export interface WaQuotedMessage {
  author: string;
  text: string;
}

export interface WaMessage {
  id: string;
  direction: WaDirection;
  kind: WaMessageKind;
  /** Corpo del messaggio o didascalia di foto/file. */
  text?: string;
  timeLabel: string;
  /** Solo per i messaggi in uscita. */
  status?: WaMessageStatus;
  /** Separatore di giornata mostrato sopra al messaggio. */
  dayLabel?: string;
  /** Autore nei gruppi (messaggi in entrata). */
  author?: string;
  authorColor?: string;
  quoted?: WaQuotedMessage;
  imageUrl?: string;
  fileName?: string;
  fileInfo?: string;
  /** Presente solo per i file allegati nella sessione (download locale). */
  fileUrl?: string;
  audioSeconds?: number;
  /** Presente solo per i vocali registrati nella sessione. */
  audioUrl?: string;
}

export interface WaChat {
  id: string;
  name: string;
  /** Sottotitolo mostrato nell'header della conversazione. */
  role: string;
  phone: string;
  initials: string;
  avatarColor: string;
  /** "online" oppure "ultimo accesso ..." */
  presence: string;
  lastLabel: string;
  unread: number;
  favorite?: boolean;
  muted?: boolean;
  isGroup?: boolean;
  messages: WaMessage[];
}

export const WA_PROFILE = {
  name: "Service aftercore",
  initials: "SA",
  avatarColor: "#0096d6",
};

export const WA_CHATS: WaChat[] = [
  {
    id: "wa-benedetti",
    name: "Marco Benedetti",
    role: "Manutenzione impianto · Interporto Verona",
    phone: "+39 348 771 2204",
    initials: "MB",
    avatarColor: "#6b7ff0",
    presence: "online",
    lastLabel: "10:14",
    unread: 2,
    favorite: true,
    messages: [
      {
        id: "mb-1",
        direction: "in",
        kind: "text",
        dayLabel: "ieri",
        text: "Buongiorno, abbiamo un problema sul sorter Multishuttle della baia 12 (DC Verona).",
        timeLabel: "17:42",
      },
      {
        id: "mb-2",
        direction: "in",
        kind: "text",
        text: "Il pignone della cinghia dentata fa un rumore metallico e sul tenditore c'è gioco evidente.",
        timeLabel: "17:43",
      },
      {
        id: "mb-3",
        direction: "out",
        kind: "text",
        text: "Ciao Marco, riesci a mandarmi una foto del pezzo smontato e il codice sulla targhetta?",
        timeLabel: "17:51",
        status: "read",
      },
      {
        id: "mb-4",
        direction: "in",
        kind: "image",
        dayLabel: "oggi",
        imageUrl: "/richieste/gbtk000018.png",
        text: "Ecco il pignone sul banco, accanto al riduttore Bonfiglioli.",
        timeLabel: "09:58",
      },
      {
        id: "mb-5",
        direction: "in",
        kind: "text",
        text: "Sulla targhetta leggo GBTK000018 — Sprocket timing belt idler, 8M, pitch P29.",
        timeLabel: "09:59",
      },
      {
        id: "mb-6",
        direction: "out",
        kind: "text",
        quoted: {
          author: "Marco Benedetti",
          text: "Sulla targhetta leggo GBTK000018 — Sprocket timing belt idler, 8M, pitch P29.",
        },
        text: "Ricevuto. Il codice risulta obsoleto a catalogo: sto cercando l'equivalente compatibile.",
        timeLabel: "10:05",
        status: "read",
      },
      {
        id: "mb-7",
        direction: "in",
        kind: "audio",
        audioSeconds: 14,
        timeLabel: "10:12",
      },
      {
        id: "mb-8",
        direction: "in",
        kind: "text",
        text: "La linea è in deroga, ci servirebbero preventivo e lead time il prima possibile 🙏",
        timeLabel: "10:14",
      },
    ],
  },
  {
    id: "wa-rinaldi",
    name: "Luca Rinaldi",
    role: "Tecnico di campo · DC Novara",
    phone: "+39 335 904 1188",
    initials: "LR",
    avatarColor: "#f0a23b",
    presence: "ultimo accesso oggi alle 09:48",
    lastLabel: "09:47",
    unread: 1,
    messages: [
      {
        id: "lr-1",
        direction: "in",
        kind: "text",
        dayLabel: "oggi",
        text: "Ciao, l'AGV 04 si è fermato in corsia 7 con errore E-317 (encoder ruota motrice).",
        timeLabel: "09:31",
      },
      {
        id: "lr-2",
        direction: "in",
        kind: "document",
        fileName: "AGV04-log-errori.pdf",
        fileInfo: "3 pagine · PDF · 240 kB",
        timeLabel: "09:33",
      },
      {
        id: "lr-3",
        direction: "out",
        kind: "text",
        text: "Ok, guardo i log. Avete già provato il reset del drive e la pulizia dell'ottica?",
        timeLabel: "09:40",
        status: "read",
      },
      {
        id: "lr-4",
        direction: "in",
        kind: "text",
        text: "Reset fatto due volte: l'allarme rientra e poi torna dopo circa 5 minuti di marcia.",
        timeLabel: "09:47",
      },
    ],
  },
  {
    id: "wa-colombo",
    name: "Sara Colombo",
    role: "Responsabile manutenzione · Pack Logistic Emilia",
    phone: "+39 340 662 7731",
    initials: "SC",
    avatarColor: "#3cb371",
    presence: "ultimo accesso oggi alle 08:55",
    lastLabel: "08:52",
    unread: 0,
    favorite: true,
    messages: [
      {
        id: "sc-1",
        direction: "in",
        kind: "text",
        dayLabel: "oggi",
        text: "Buongiorno, sul conveyor del DC Parma ci servono 4 pz del pignone Siemens 04811-51528.",
        timeLabel: "08:34",
      },
      {
        id: "sc-2",
        direction: "in",
        kind: "text",
        text: "È quello a 15 denti, foro 1-7/16\". Il muletto ha urtato la testata e sono saltati i denti.",
        timeLabel: "08:35",
      },
      {
        id: "sc-3",
        direction: "in",
        kind: "image",
        imageUrl: "/richieste/impianto-pneumatico.jpg",
        text: "Foto della zona: anche il gruppo pneumatico va verificato.",
        timeLabel: "08:41",
      },
      {
        id: "sc-4",
        direction: "out",
        kind: "text",
        text: "Perfetto Sara, il codice è disponibile. Ti mando l'offerta per i 4 pignoni entro oggi.",
        timeLabel: "08:52",
        status: "delivered",
      },
    ],
  },
  {
    id: "wa-ferraro",
    name: "Davide Ferraro",
    role: "Tecnico elettrico · Linea 3 stabilimento Brescia",
    phone: "+39 351 220 4470",
    initials: "DF",
    avatarColor: "#8b5cf6",
    presence: "ultimo accesso ieri alle 18:20",
    lastLabel: "ieri",
    unread: 0,
    messages: [
      {
        id: "df-1",
        direction: "in",
        kind: "text",
        dayLabel: "ieri",
        text: "Sul quadro bordo macchina della Linea 3 l'inverter va in allarme OC2 ad ogni avvio in carico.",
        timeLabel: "17:02",
      },
      {
        id: "df-2",
        direction: "out",
        kind: "text",
        text: "Mi passi un vocale con la sequenza esatta degli allarmi? Così giro tutto al collega di automazione.",
        timeLabel: "17:20",
        status: "read",
      },
      {
        id: "df-3",
        direction: "in",
        kind: "audio",
        audioSeconds: 32,
        timeLabel: "18:14",
      },
    ],
  },
  {
    id: "wa-riva",
    name: "Elena Riva",
    role: "Ufficio tecnico · LogNord Distribution",
    phone: "+39 328 163 9196",
    initials: "ER",
    avatarColor: "#ef6461",
    presence: "ultimo accesso ieri alle 16:05",
    lastLabel: "ieri",
    unread: 0,
    messages: [
      {
        id: "er-1",
        direction: "in",
        kind: "text",
        dayLabel: "ieri",
        text: "Salve, per il magazzino automatico di Novara serve sostituire l'assieme pignone/albero 14067P-001.",
        timeLabel: "15:48",
      },
      {
        id: "er-2",
        direction: "in",
        kind: "document",
        fileName: "14067P-001-scheda-ricambio.pdf",
        fileInfo: "2 pagine · PDF · 118 kB",
        timeLabel: "15:49",
      },
      {
        id: "er-3",
        direction: "out",
        kind: "text",
        text: "Grazie Elena, verifico se è ancora a listino o se serve un equivalente. Quantità 2 pz, corretto?",
        timeLabel: "16:02",
        status: "read",
      },
      {
        id: "er-4",
        direction: "in",
        kind: "text",
        text: "Sì, 2 pz. Contratto service sito Novara.",
        timeLabel: "16:04",
      },
    ],
  },
  {
    id: "wa-turno-notte",
    name: "Service Nord — turno notte",
    role: "Gruppo · 6 partecipanti",
    phone: "Gruppo",
    initials: "SN",
    avatarColor: "#54656f",
    presence: "Andrea, Matteo, Giorgio, Luca, Sara",
    lastLabel: "ieri",
    unread: 3,
    isGroup: true,
    messages: [
      {
        id: "sn-1",
        direction: "in",
        kind: "text",
        dayLabel: "ieri",
        author: "Andrea Moretti",
        authorColor: "#1f7aec",
        text: "Ho lasciato in officina il motoriduttore smontato dalla navetta 2, da controllare domani.",
        timeLabel: "23:10",
      },
      {
        id: "sn-2",
        direction: "in",
        kind: "text",
        author: "Matteo Greco",
        authorColor: "#d9534f",
        text: "Il trasloelevatore T2 si è fermato due volte per fotocellula sporca in corsia 4.",
        timeLabel: "23:34",
      },
      {
        id: "sn-3",
        direction: "in",
        kind: "audio",
        author: "Giorgio Salvi",
        authorColor: "#7a45c9",
        audioSeconds: 21,
        timeLabel: "01:12",
      },
    ],
  },
  {
    id: "wa-greco",
    name: "Matteo Greco",
    role: "Manutentore · CEDI Bologna",
    phone: "+39 366 445 0921",
    initials: "MG",
    avatarColor: "#0ea5a5",
    presence: "ultimo accesso lunedì alle 11:40",
    lastLabel: "lunedì",
    unread: 0,
    messages: [
      {
        id: "mg-1",
        direction: "in",
        kind: "text",
        dayLabel: "lunedì",
        text: "Il trasloelevatore T2 dà allarme di posizionamento: la fotocellula di corsia perde il riferimento.",
        timeLabel: "10:58",
      },
      {
        id: "mg-2",
        direction: "out",
        kind: "text",
        text: "Provate a pulire riflettore e lente e riallineare il sensore; se torna, sostituiamo la fotocellula.",
        timeLabel: "11:26",
        status: "read",
      },
      {
        id: "mg-3",
        direction: "in",
        kind: "text",
        text: "Pulita e riallineata, per ora regge. Vi aggiorno a fine turno.",
        timeLabel: "11:39",
      },
    ],
  },
  {
    id: "wa-salvi",
    name: "Giorgio Salvi",
    role: "Tecnico esterno · Salvi Impianti",
    phone: "+39 333 908 1145",
    initials: "GS",
    avatarColor: "#b07d4e",
    presence: "ultimo accesso 09/09/2026",
    lastLabel: "09/09/2026",
    unread: 0,
    muted: true,
    messages: [
      {
        id: "gs-1",
        direction: "in",
        kind: "text",
        dayLabel: "09/09/2026",
        text: "Intervento sulla pressa PR-12 chiuso: sostituita la valvola proporzionale e rifatto il ciclo di prova.",
        timeLabel: "16:22",
      },
      {
        id: "gs-2",
        direction: "in",
        kind: "document",
        fileName: "RAP-2026-0142-pressa-PR12.pdf",
        fileInfo: "1 pagina · PDF · 96 kB",
        timeLabel: "16:23",
      },
      {
        id: "gs-3",
        direction: "out",
        kind: "text",
        text: "Grazie Giorgio, rapportino archiviato.",
        timeLabel: "16:40",
        status: "read",
      },
    ],
  },
];

/** Durata vocale nel formato 0:00. */
export function formatAudioDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const min = Math.floor(safe / 60);
  const sec = safe % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

/** Dimensione file leggibile per le card documento. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Riga di anteprima mostrata nella lista chat. */
export function previewOfMessage(message: WaMessage): string {
  const prefix = message.author ? `${message.author.split(" ")[0]}: ` : "";
  switch (message.kind) {
    case "image":
      return `${prefix}Foto${message.text ? ` — ${message.text}` : ""}`;
    case "document":
      return `${prefix}${message.fileName ?? "Documento"}`;
    case "audio":
      return `${prefix}Messaggio vocale (${formatAudioDuration(
        message.audioSeconds ?? 0
      )})`;
    default:
      return `${prefix}${message.text ?? ""}`;
  }
}
