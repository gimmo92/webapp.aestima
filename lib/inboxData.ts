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
// (IDC-114-084, MX-4521, TC-7788, FR-3092) così l'agente riesce a identificarle.
// I testi sono volutamente vaghi, senza codici ricambio.
// -------------------------------------------------------------

export const MOCK_REQUESTS: PartRequest[] = [
  {
    id: "req-001",
    from: "Marco Rossi",
    fromEmail: "m.rossi@rossimeccanica.it",
    company: "Rossi Meccanica S.r.l.",
    subject: "Curva rinvio impianto IDC 114",
    body:
      "Buongiorno,\n\nsull'impianto IDC 114 TCZ matricola IDC-114-084 la curva di rinvio 90° ha gioco eccessivo e perdiamo tensione sul cavo. Ci serve un preventivo per la curva rinvio completa montata, con tutti i componenti della distinta (perno, interno, cuscinetti, viteria) compreso il montaggio in officina.\n\nLa macchina è ferma, serve il prima possibile.\n\nGrazie,\nMarco Rossi",
    receivedLabel: "09:12",
    receivedFull: "Oggi, 09:12",
    status: "nuova",
    labelIds: [],
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
    labelIds: [],
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
    subject: "Ruota traino IDC 114 — usura corona",
    body:
      "Buongiorno,\n\nsull'impianto IDC matricola IDC-114-084 la ruota di traino ha la corona usurata e i contenimenti danneggiati. Ci serve un preventivo per la ruota traino completa secondo distinta 1381400061_F, comprensiva di carpenteria e montaggio.\n\nFatemi sapere tempi e costi.\n\nGrazie",
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
    subject: "Assieme fune IDC 114 — sostituzione completa",
    body:
      "Gentili,\n\nci occorre l'assieme fune completo per l'impianto IDC 114 TCZ matricola IDC-114-084 (distinta 3051600250_134): cavo acciaio zincato D.6, giunti, semidisco olefinica e montaggio.\n\nRestiamo in attesa di offerta.\n\nFrancesca Galli - Ufficio Acquisti",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 10:08",
    status: "inviata",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "req-017",
    from: "Paolo Martini",
    fromEmail: "p.martini@liftcare.it",
    company: "LiftCare Service S.r.l.",
    subject: "Perno curva rinvio IDC-114-084",
    body:
      "Buongiorno,\n\nsull'impianto IDC matricola IDC-114-084 ci serve solo il perno curva (cod. 1291200130) della distinta rinvio, zincato a freddo. Non ci serve l'intera curva montata.\n\nPotete inviarci preventivo per 1 pezzo?\n\nGrazie,\nPaolo Martini",
    receivedLabel: "08:30",
    receivedFull: "Oggi, 08:30",
    status: "identificata",
    labelIds: [],
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
    primary: true,
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
    primary: true,
  },
  // -------------------------------------------------------------
  // Tab "Altre" — email in arrivo che NON sono richieste ricambi.
  // -------------------------------------------------------------
  {
    id: "req-010",
    from: "Ufficio Amministrazione",
    fromEmail: "amministrazione@rossimeccanica.it",
    company: "Rossi Meccanica S.r.l.",
    subject: "Sollecito pagamento fattura n. 2024/1187",
    body:
      "Spett.le,\n\ncon la presente Vi ricordiamo che la fattura n. 2024/1187 del 15/05, importo € 2.340,00, risulta scaduta il 30/06.\n\nVi preghiamo di provvedere al saldo entro 5 giorni lavorativi o di inviarci la contabile.\n\nDistinti saluti,\nUfficio Amministrazione",
    receivedLabel: "10:22",
    receivedFull: "Oggi, 10:22",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-011",
    from: "Academy Industria",
    fromEmail: "info@academyindustria.it",
    company: "Academy Industria",
    subject: "Invito — Corso manutenzione predittiva CNC (15 luglio)",
    body:
      "Gentile operatore,\n\nLa invitiamo al webinar gratuito \"Manutenzione predittiva su torni e centri di lavoro\" in programma il 15 luglio alle 10:00.\n\nProgramma: vibrazioni, termografia, best practice OEM.\n\nIscrizione: rispondere a questa email o cliccare il link nell'invito allegato.\n\nCordiali saluti,\nTeam Academy Industria",
    receivedLabel: "09:48",
    receivedFull: "Oggi, 09:48",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-012",
    from: "Luca Mariani",
    fromEmail: "l.mariani@gmail.com",
    company: "—",
    subject: "Candidatura — Posizione tecnico after-sales",
    body:
      "Buongiorno,\n\nmi chiamo Luca Mariani, tecnico meccatronico con 8 anni di esperienza in assistenza su macchine utensili.\n\nVi allego il mio CV per eventuali posizioni aperte nel Vostro ufficio tecnico / field service.\n\nResto a disposizione per un colloquio conoscitivo.\n\nCordiali saluti,\nLuca Mariani",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 14:55",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-013",
    from: "Elena Russo",
    fromEmail: "e.russo@logisticanord.it",
    company: "Logistica Nord S.p.A.",
    subject: "Conferma ritiro merce — DDT 8842/24",
    body:
      "Buongiorno,\n\nconfermiamo il ritiro della merce presso il Vostro magazzino previsto per mercoledì 9/07 tra le 08:00 e le 12:00.\n\nRiferimento: DDT 8842/24 — 3 colli, peso lordo 48 kg.\n\nIl nostro autista presenterà il documento di trasporto.\n\nGrazie,\nElena Russo — Ufficio Trasporti",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 09:30",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-014",
    from: "Marco Ferretti",
    fromEmail: "m.ferretti@meccanicanord.it",
    company: "Meccanica Nord S.r.l.",
    subject: "Aggiornamento listino trasmissioni Q3 2025",
    body:
      "Spett.le Partner,\n\nin allegato trovate il nuovo listino trasmissioni e pulegge valido dal 1° luglio 2025.\n\nVariazioni principali: +3% su cinghie HTD, invariati i tempi di consegna standard.\n\nPer ordini urgenti contattare il reparto vendite.\n\nCordiali saluti,\nMarco Ferretti — Area Commerciale",
    receivedLabel: "25/06",
    receivedFull: "25 giugno, 11:20",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-015",
    from: "Google Workspace",
    fromEmail: "noreply@google.com",
    company: "Google",
    subject: "Nuovo accesso al vostro account Google Workspace",
    body:
      "È stato rilevato un nuovo accesso all'account amministrazione@aestima.demo da Windows, Vicenza, IT.\n\nSe eravate Voi, ignorate questo messaggio. In caso contrario, verificate l'attività recente e cambiate la password.\n\nQuesto è un messaggio automatico, non rispondere.",
    receivedLabel: "24/06",
    receivedFull: "24 giugno, 06:12",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-016",
    from: "Silvia Neri",
    fromEmail: "manutenzione@deltamanufacturing.it",
    company: "Delta Manufacturing",
    subject: "Appuntamento revisione annuale macchine — luglio",
    body:
      "Buongiorno,\n\nvorremmo fissare la revisione annuale programmata per le nostre 3 macchine in linea (rettificatrice, tornio e fresatrice).\n\nSiete disponibili nella settimana dal 14 al 18 luglio? Preferiamo il mattino.\n\nNon è una richiesta di ricambi: serve solo l'intervento di controllo previsto da contratto.\n\nGrazie,\nSilvia Neri",
    receivedLabel: "23/06",
    receivedFull: "23 giugno, 16:40",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
];
