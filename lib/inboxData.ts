import type { Label, PartRequest, StatusConfig } from "./inboxTypes";

// =============================================================
// DATI MOCK — dashboard richieste ricambi after-sales
// -------------------------------------------------------------
// NB (produzione): la lista richieste si popolerebbe dalla casella
// email reale del cliente (IMAP / API del provider di posta) e lo
// stato + le etichette verrebbero persistiti su un database.
// Qui è TUTTO mock, in memoria, solo per la demo.
// =============================================================

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

/** Etichette custom iniziali. Se ne possono creare di nuove a runtime. */
export const DEFAULT_LABELS: Label[] = [
  { id: "urgente", name: "Urgente", color: "#ef4444" },
  { id: "cliente_chiave", name: "Cliente chiave", color: "#a855f7" },
  { id: "garanzia", name: "Garanzia", color: "#06b6d4" },
];

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

// -------------------------------------------------------------
// Le richieste referenziano le matricole presenti in lib/mockData.ts
// (MX-4521, TC-7788, FR-3092) così l'agente riesce a identificarle.
// I testi sono volutamente vaghi, senza codici ricambio.
// -------------------------------------------------------------

export const MOCK_REQUESTS: PartRequest[] = [
  {
    id: "req-001",
    from: "Marco Rossi",
    fromEmail: "m.rossi@rossimeccanica.it",
    company: "Rossi Meccanica S.r.l.",
    subject: "URGENTE - perdita sulla rettificatrice",
    body:
      "Buongiorno,\n\nsi è rotto il componente di tenuta sulla macchina che abbiamo comprato nel 2019, numero di serie MX-4521. Perde olio e siamo fermi.\n\nCi serve un preventivo il prima possibile, la produzione è bloccata.\n\nGrazie,\nMarco Rossi",
    receivedLabel: "09:12",
    receivedFull: "Oggi, 09:12",
    status: "nuova",
    labelIds: ["urgente"],
    primary: true,
  },
  {
    id: "req-009",
    from: "Davide Fontana",
    fromEmail: "d.fontana@fontanaengineering.it",
    company: "Fontana Engineering S.r.l.",
    subject: "Perdita d'aria cambio utensile - foto allegata",
    body:
      "Buongiorno,\n\nsul centro di fresatura matricola FR-3092 abbiamo una forte perdita d'aria in corrispondenza del gruppo pneumatico del cambio utensile. Il cambio non aggancia più bene l'utensile.\n\nVi allego una foto dell'impianto pneumatico interessato, così vedete di cosa si tratta. Pensiamo siano da rifare le tenute.\n\nPotete mandarci un preventivo?\n\nGrazie,\nDavide Fontana - Ufficio Tecnico",
    receivedLabel: "09:05",
    receivedFull: "Oggi, 09:05",
    status: "nuova",
    labelIds: ["urgente"],
    primary: true,
    attachments: [
      {
        name: "impianto-pneumatico.jpg",
        url: "/richieste/impianto-pneumatico.jpg",
        kind: "image",
      },
    ],
  },
  {
    id: "req-002",
    from: "Laura Bianchi",
    fromEmail: "ufficio.tecnico@officinebianchi.com",
    company: "Officine Bianchi S.p.A.",
    subject: "Problema pompa refrigerante tornio",
    body:
      "Salve,\n\nsul nostro tornio a controllo numerico (matricola TC-7788) la pompa del liquido refrigerante ha smesso di funzionare, non manda più refrigerante in zona lavoro.\n\nPotete mandarci un'offerta per la sostituzione?\n\nCordiali saluti,\nLaura Bianchi",
    receivedLabel: "08:47",
    receivedFull: "Oggi, 08:47",
    status: "identificata",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "req-003",
    from: "Giuseppe Verdi",
    fromEmail: "g.verdi@gammasrl.it",
    company: "Gamma S.r.l.",
    subject: "Cinghia rettificatrice da sostituire",
    body:
      "Buongiorno,\n\nabbiamo bisogno di sostituire la cinghia di trasmissione del mandrino sulla rettificatrice matricola MX-4521. Fa un rumore strano e slitta.\n\nFatemi sapere tempi e costi.\n\nGrazie",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 16:30",
    status: "attesa_fornitore",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-004",
    from: "Silvia Neri",
    fromEmail: "manutenzione@deltamanufacturing.it",
    company: "Delta Manufacturing",
    subject: "Fresatrice - rumore anomalo testa",
    body:
      "Salve,\n\nla nostra fresatrice (serial FR-3092) ha iniziato a fare un rumore anomalo dalla testa e vibra. Temiamo sia il mandrino. La macchina è ancora in garanzia?\n\nPotete verificare e mandarci un preventivo?\n\nSilvia Neri - Ufficio Manutenzione",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 11:05",
    status: "da_identificare",
    labelIds: ["garanzia"],
    primary: true,
  },
  {
    id: "req-005",
    from: "Andrea Conti",
    fromEmail: "a.conti@epsilonindustrie.com",
    company: "Epsilon Industrie",
    subject: "Sensore finecorsa asse X non legge",
    body:
      "Buongiorno,\n\nsul tornio matricola TC-7788 il sensore di finecorsa dell'asse X non viene più letto dal controllo. Abbiamo bisogno del ricambio.\n\nInviateci cortesemente il preventivo.\n\nAndrea Conti",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 14:22",
    status: "preventivo_pronto",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-006",
    from: "Francesca Galli",
    fromEmail: "acquisti@zetaprecision.it",
    company: "Zeta Precision S.r.l.",
    subject: "Cuscinetto mandrino rettificatrice",
    body:
      "Gentili,\n\nci occorre il cuscinetto del mandrino per la rettificatrice matricola MX-4521. Si sente del gioco sull'albero.\n\nRestiamo in attesa di offerta.\n\nFrancesca Galli - Ufficio Acquisti",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 10:08",
    status: "inviata",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "req-007",
    from: "Paolo Ferrari",
    fromEmail: "p.ferrari@omegatools.it",
    company: "Omega Tools",
    subject: "Filtro aria compressa fresatrice",
    body:
      "Buongiorno,\n\nvorremmo ordinare il filtro dell'aria compressa in linea per la fresatrice FR-3092. Quello attuale è intasato.\n\nGrazie mille,\nPaolo Ferrari",
    receivedLabel: "26/06",
    receivedFull: "26 giugno, 15:40",
    status: "vinta",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-008",
    from: "Chiara Moretti",
    fromEmail: "c.moretti@kappautomazioni.it",
    company: "Kappa Automazioni",
    subject: "Re: preventivo kit tenute",
    body:
      "Buongiorno,\n\ngrazie per la disponibilità ma per il kit tenute del cambio utensile della fresatrice FR-3092 abbiamo trovato una soluzione internamente. Non procediamo con l'ordine.\n\nGrazie comunque,\nChiara Moretti",
    receivedLabel: "24/06",
    receivedFull: "24 giugno, 09:15",
    status: "persa",
    labelIds: [],
    primary: false,
  },
];
