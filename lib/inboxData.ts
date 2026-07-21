import type { Label, PartRequest, StatusConfig } from "./inboxTypes";

// =============================================================
// DATI DEMO — sorgente seed SOLO per company "spark"
// -------------------------------------------------------------
// Email allineate al parco / listino Vallmec in
// Desktop/dummy data demo (VLM-2200 + ricambi in archivio).
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
// Richieste su matricole / ricambi presenti in dummy data demo
// (Parco_installato_Vallmec + Listino + DB_VLM-2200_rev.C).
// I testi sono realistici: a volte vaghi, a volte con indizi.
// -------------------------------------------------------------

export const MOCK_REQUESTS: PartRequest[] = [
  {
    id: "req-001",
    from: "Marco Rossi",
    fromEmail: "m.rossi@pontenuovo.it",
    company: "Salumificio Ponte Nuovo S.p.A.",
    subject: "Cinghia dentata gruppo spinta — VLM-2200 matr. 1389",
    body:
      "Buongiorno,\n\nsull'incartonatrice VLM-2200 matricola 1389 (stabilimento Langhirano) la cinghia dentata del gruppo spinta è usurata e inizia a saltare i denti. Ci serve un preventivo per la cinghia AT10 da 2250 mm (altezza 25).\n\nLa linea è quasi ferma, serve il prima possibile.\n\nGrazie,\nMarco Rossi — Manutenzione",
    receivedLabel: "09:12",
    receivedFull: "Oggi, 09:12",
    status: "nuova",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-009",
    from: "Elena Fontanini",
    fromEmail: "e.fontanini@fontanini.it",
    company: "Dolciaria Fontanini S.r.l.",
    subject: "Ventose soffietto formazione cartone — foto allegata",
    body:
      "Buongiorno,\n\nsulla nostra VLM-2200 matricola 1418 a Parma le ventose a soffietto del magazzino fustellati non tengono più il cartone: ne cambiamo spesso ma vorremmo il ricambio corretto (D.50 NBR).\n\nVi allego una foto del gruppo formazione. Potete mandarci un preventivo per 6 pezzi?\n\nGrazie,\nElena Fontanini — Ufficio Tecnico",
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
    fromEmail: "l.bianchi@nutrilab.it",
    company: "Nutrilab Integratori S.r.l.",
    subject: "Fotocellula presenza prodotto — VLM-2200 1412",
    body:
      "Salve,\n\nsull'incartonatrice automatica VLM-2200 matricola 1412 (Bergamo) la fotocellula di presenza prodotto non legge più i fustellati in ingresso. Sospettiamo sia la E3Z-D62.\n\nPotete mandarci un'offerta per la sostituzione?\n\nCordiali saluti,\nLaura Bianchi",
    receivedLabel: "08:47",
    receivedFull: "Oggi, 08:47",
    status: "identificata",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "req-003",
    from: "Giuseppe Verdi",
    fromEmail: "g.verdi@molinoserravalle.it",
    company: "Molino Serravalle S.r.l.",
    subject: "Lame taglio nastro + kit 2000 ore — matr. 1475",
    body:
      "Buongiorno,\n\nsulla VLM-2200 matricola 1475 ci servono le lame di taglio nastro (testata nastrante) e, se possibile, anche il kit manutenzione 2.000 ore completo.\n\nFatemi sapere tempi e costi.\n\nGrazie,\nGiuseppe Verdi",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 16:30",
    status: "attesa_fornitore",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-004",
    from: "Silvia Neri",
    fromEmail: "manutenzione@valtrebbia.it",
    company: "Caseificio Val Trebbia S.p.A.",
    subject: "Rumore / gioco sul gruppo spinta — VLM-2200",
    body:
      "Salve,\n\nla nostra incartonatrice VLM-2200 (serial 1364, Bobbio) ha iniziato a fare rumore anomalo sul gruppo spinta e vibra in fase di inserimento. Temiamo pattini guida o cinghia.\n\nLa macchina è ancora in contratto service base. Potete verificare e mandarci un preventivo?\n\nSilvia Neri — Ufficio Manutenzione",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 11:05",
    status: "da_identificare",
    labelIds: ["garanzia"],
    primary: true,
  },
  {
    id: "req-005",
    from: "Andrea Conti",
    fromEmail: "a.conti@lorentin.it",
    company: "Farmaceutici Lorentin S.p.A.",
    subject: "Sensore finecorsa asse spinta non legge",
    body:
      "Buongiorno,\n\nsulla VLM-2200 matricola 1432 (Origgio) il sensore di finecorsa induttivo M12 del gruppo spinta non viene più letto dal PLC. Abbiamo bisogno del ricambio.\n\nInviateci cortesemente il preventivo.\n\nAndrea Conti",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 14:22",
    status: "preventivo_pronto",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-006",
    from: "Francesca Galli",
    fromEmail: "acquisti@pontenuovo.it",
    company: "Salumificio Ponte Nuovo S.p.A.",
    subject: "Tappeto modulare alimentazione — matr. 1389",
    body:
      "Gentili,\n\nci occorre il tappeto modulare acetalica passo 25,4 (larghezza 300) per il nastro alimentazione della VLM-2200 matricola 1389. Quello attuale è usurato dopo ~4 anni.\n\nRestiamo in attesa di offerta (prezzo al metro).\n\nFrancesca Galli — Ufficio Acquisti",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 10:08",
    status: "inviata",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "req-017",
    from: "Paolo Martini",
    fromEmail: "p.martini@valtrebbia.it",
    company: "Caseificio Val Trebbia S.p.A.",
    subject: "Cuscinetti 6205 nastro alimentazione — 1301",
    body:
      "Buongiorno,\n\nsull'incartonatrice VLM-2200 matricola 1301 ci servono i cuscinetti 6205-2RS del tamburo motrice (nastro alimentazione). Non ci serve l'intero assieme.\n\nPotete inviarci preventivo per 4 pezzi?\n\nGrazie,\nPaolo Martini",
    receivedLabel: "08:30",
    receivedFull: "Oggi, 08:30",
    status: "identificata",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-007",
    from: "Paolo Ferrari",
    fromEmail: "p.ferrari@torrefazionesud.it",
    company: "Caffè Torrefazione Sud S.r.l.",
    subject: "Testata nastrante superiore — VLM-2200 1441",
    body:
      "Buongiorno,\n\nvorremmo ordinare la testata nastrante superiore 50 mm per la VLM-2200 matricola 1441 (Salerno). Quella attuale non taglia più bene il nastro.\n\nGrazie mille,\nPaolo Ferrari",
    receivedLabel: "26/06",
    receivedFull: "26 giugno, 15:40",
    status: "vinta",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-008",
    from: "Chiara Moretti",
    fromEmail: "c.moretti@nutrilab.it",
    company: "Nutrilab Integratori S.r.l.",
    subject: "Re: preventivo kit manutenzione 8000 ore",
    body:
      "Buongiorno,\n\ngrazie per la disponibilità ma per il kit manutenzione 8.000 ore della VLM-2200 matricola 1412 abbiamo trovato una soluzione internamente. Non procediamo con l'ordine.\n\nGrazie comunque,\nChiara Moretti",
    receivedLabel: "24/06",
    receivedFull: "24 giugno, 09:15",
    status: "persa",
    labelIds: [],
    primary: false,
  },
  // -------------------------------------------------------------
  // Tab "Altre" — email in arrivo che NON sono richieste ricambi.
  // -------------------------------------------------------------
  {
    id: "req-010",
    from: "Ufficio Amministrazione",
    fromEmail: "amministrazione@pontenuovo.it",
    company: "Salumificio Ponte Nuovo S.p.A.",
    subject: "Sollecito pagamento fattura n. 2026/0441",
    body:
      "Spett.le,\n\ncon la presente Vi ricordiamo che la fattura n. 2026/0441 del 15/05, importo € 2.340,00, risulta scaduta il 30/06.\n\nVi preghiamo di provvedere al saldo entro 5 giorni lavorativi o di inviarci la contabile.\n\nDistinti saluti,\nUfficio Amministrazione",
    receivedLabel: "10:22",
    receivedFull: "Oggi, 10:22",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-011",
    from: "Academy Packaging",
    fromEmail: "info@academypackaging.it",
    company: "Academy Packaging",
    subject: "Invito — Corso manutenzione predittiva incartonatrici (15 luglio)",
    body:
      "Gentile partner Vallmec,\n\nLa invitiamo al webinar gratuito \"Manutenzione predittiva su linee di fine linea\" in programma il 15 luglio alle 10:00.\n\nProgramma: vibrazioni, termografia, best practice OEM su VLM-1600/1800/2200.\n\nIscrizione: rispondere a questa email.\n\nCordiali saluti,\nTeam Academy Packaging",
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
      "Buongiorno,\n\nmi chiamo Luca Mariani, tecnico meccatronico con 8 anni di esperienza in assistenza su linee di packaging.\n\nVi allego il mio CV per eventuali posizioni aperte nel Vostro ufficio tecnico / field service.\n\nResto a disposizione per un colloquio conoscitivo.\n\nCordiali saluti,\nLuca Mariani",
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
    subject: "Conferma ritiro merce — DDT 8842/26",
    body:
      "Buongiorno,\n\nconfermiamo il ritiro della merce presso il Vostro magazzino previsto per mercoledì 9/07 tra le 08:00 e le 12:00.\n\nRiferimento: DDT 8842/26 — 3 colli, peso lordo 48 kg.\n\nIl nostro autista presenterà il documento di trasporto.\n\nGrazie,\nElena Russo — Ufficio Trasporti",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 09:30",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-014",
    from: "Marco Ferretti",
    fromEmail: "m.ferretti@skf.it",
    company: "SKF Italia S.p.A.",
    subject: "Aggiornamento listino cuscinetti Q3 2026",
    body:
      "Spett.le Partner,\n\nin allegato trovate il nuovo listino cuscinetti e supporti valido dal 1° luglio 2026.\n\nVariazioni principali: +2% su serie 6200, invariati i tempi di consegna standard.\n\nPer ordini urgenti contattare il reparto vendite.\n\nCordiali saluti,\nMarco Ferretti — Area Commerciale",
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
      "È stato rilevato un nuovo accesso all'account service@vallmec.demo da Windows, Piacenza, IT.\n\nSe eravate Voi, ignorate questo messaggio. In caso contrario, verificate l'attività recente e cambiate la password.\n\nQuesto è un messaggio automatico, non rispondere.",
    receivedLabel: "24/06",
    receivedFull: "24 giugno, 06:12",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-016",
    from: "Silvia Neri",
    fromEmail: "manutenzione@valtrebbia.it",
    company: "Caseificio Val Trebbia S.p.A.",
    subject: "Appuntamento revisione annuale VLM-2200 — luglio",
    body:
      "Buongiorno,\n\nvorremmo fissare la revisione annuale programmata per le nostre VLM-2200 (matricole 1301 e 1364).\n\nSiete disponibili nella settimana dal 14 al 18 luglio? Preferiamo il mattino.\n\nNon è una richiesta di ricambi: serve solo l'intervento di controllo previsto da contratto.\n\nGrazie,\nSilvia Neri",
    receivedLabel: "23/06",
    receivedFull: "23 giugno, 16:40",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
];
