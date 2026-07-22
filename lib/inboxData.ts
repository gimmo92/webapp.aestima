import type { Label, PartRequest, StatusConfig } from "./inboxTypes";

// =============================================================
// DATI DEMO — sorgente seed SOLO per company "spark"
// -------------------------------------------------------------
// Email allineate a Desktop/dummy data demo:
//   Parco_installato_Vallmec.xlsx
//   Listino_ricambi_Vallmec_2026.xlsx
//   Storico_offerte_ricambi.xlsx
//   DB_VLM-2200_rev.C.xlsx / BOM_export_gestionale.csv
//   Offerta_2026-0417_Fontanini.pdf
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
// Richieste ricambi — clienti / matricole / codici dal dummy data
// -------------------------------------------------------------

export const MOCK_REQUESTS: PartRequest[] = [
  {
    id: "req-001",
    from: "Marco Rossi",
    fromEmail: "m.rossi@pontenuovo.it",
    company: "Salumificio Ponte Nuovo S.p.A.",
    subject: "Cinghia gruppo spinta rotta, urgente — matr. 1389",
    body:
      "Buongiorno,\n\ncinghia gruppo spinta rotta, urgente. Macchina: VLM 2200 matricola 1389, stabilimento Langhirano (PR). Distinta di riferimento DB VLM-2200 rev.C.\n\nDal listino 2026 credo sia il codice VLM-400-009/2 (cinghia dentata AT10 L=2250 h.25) — sostituita ogni 4.000 h. Non abbiamo contratto service su questa macchina.\n\nLinea quasi ferma: preventivo e disponibilità magazzino il prima possibile.\n\nGrazie,\nMarco Rossi — Manutenzione",
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
    subject: "Cartone si apre male — ventose matr. 1418 (rif. Offerta 2026-0417)",
    body:
      "Buongiorno,\n\ncartone si apre male sul lato destro, forse ventose. VLM 2200 matr. 1418 (Parma), distinta DB VLM-2200 rev.C.\n\nVi allego una foto del gruppo formazione. Servirebbero 6 pezzi VLM-300-004 Ventosa a soffietto D.50 NBR (Festo ESS-50-SN, usura ogni 2.000 h) come da Catalogo ricambi Vallmec VLM-2200.\n\nRiferimento precedente: Offerta_2026-0417_Fontanini — potete aggiornare i prezzi a listino 2026?\n\nGrazie,\nElena Fontanini — Ufficio Tecnico",
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
    subject: "Fotocellula ingresso non rileva il prodotto — VLM 2200 1412",
    body:
      "Salve,\n\nfotocellula ingresso non rileva il prodotto. Incartonatrice automatica VLM 2200 matricola 1412, Bergamo. Contratto service full (fascia A listino).\n\nSospettiamo VLM-200-040 Fotocellula presenza prodotto E3Z-D62 (Omron). Potete mandarci un'offerta per la sostituzione (prezzo netto fascia A)?\n\nNota: su questa macchina in storico avevate già quotato anche VLM-400-009/2 (OFF-2025-0153).\n\nCordiali saluti,\nLaura Bianchi",
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
    subject: "Lame nastratrice + kit 2.000 ore — matr. 1475",
    body:
      "Buongiorno,\n\nservono 2 lame per la nastratrice e, se possibile, il kit manutenzione 2.000 ore completo.\n\nMacchina: VLM 2200 matricola 1475, Serravalle Scrivia (AL), contratto service base (fascia B). Distinta DB VLM-2200 rev.C.\n\nCodici listino 2026:\n- VLM-500-011 Lama di taglio nastro (Siat LM-50-INOX) × 2\n- VLM-KIT-2000H Kit manutenzione 2.000 ore VLM 2200\n\nFatemi sapere tempi (LT listino) e costi netti fascia B.\n\nGrazie,\nGiuseppe Verdi",
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
    subject: "Rumore / gioco sul gruppo spinta — VLM 2200 Bobbio",
    body:
      "Salve,\n\nla nostra incartonatrice VLM 2200 (non ricordo se 1364 o 1395, entrambe a Bobbio PC) ha iniziato a fare rumore anomalo sul gruppo spinta e vibra in fase di inserimento.\n\nTemiamo pattini guida (VLM-400-004?) o cinghia AT10 2250. Abbiamo contratto service base sulla 1364 e sulla 1395.\n\nPotete verificare su Parco installato / distinta rev.C e mandarci un preventivo?\n\nSilvia Neri — Ufficio Manutenzione",
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
    subject: "Sensore finecorsa slitta da sostituire — matr. 1432",
    body:
      "Buongiorno,\n\nsensore finecorsa slitta da sostituire. VLM 2200 matricola 1432, Origgio (VA), contratto service full.\n\nDal Catalogo / Listino ricambi Vallmec 2026: VLM-400-030 Sensore di finecorsa induttivo M12 (Pepperl+Fuchs NBB4-12GM50-E2).\n\nInviateci cortesemente il preventivo (fascia A).\n\nAndrea Conti",
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
    subject: "Quanto costa il tappeto modulare nastro alimentazione — 1389",
    body:
      "Gentili,\n\nquanto costa il tappeto modulare del nastro alimentazione? VLM 2200 matr. 1389 Langhirano.\n\nDal listino 2026: VLM-200-002 Tappeto modulare passo 25,4 acetalica (Intralox 900 SERIES) — prezzo al metro, larghezza 300. Giacenza dichiarata 6 m / LT 30 gg.\n\nCi servono circa 24 m (come distinta BOM_export / DB_VLM-2200_rev.C, art. 200002).\n\nRestiamo in attesa di offerta.\n\nFrancesca Galli — Ufficio Acquisti",
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
    subject: "Cuscinetto rumoroso lato motore nastro — matr. 1301",
    body:
      "Buongiorno,\n\ncuscinetto rumoroso lato motore nastro alimentazione. VLM 2200 matricola 1301 (Bobbio), contratto service full, distinta DB VLM-2200 rev.C.\n\nNon ci serve l'intero assieme: solo VLM-CU-6205 Cuscinetto rigido a sfere 6205-2RS1 (SKF) × 4 pezzi.\n\nEventualmente anche VLM-200-011 Supporto flangiato UCF 205 se consigliato.\n\nGrazie,\nPaolo Martini",
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
    subject: "Testata nastrante superiore da sostituire — VLM 2200 1441",
    body:
      "Buongiorno,\n\ntestata nastrante superiore da revisionare o sostituire. VLM 2200 matricola 1441, Salerno, optional visione artificiale controllo chiusura, contratto service base.\n\nCodice listino: VLM-500-001 Testata nastrante superiore 50 mm (Siat AS-50-U). Se utile, aggiungete anche VLM-500-011 lame (min. 2 pz).\n\nGrazie mille,\nPaolo Ferrari",
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
    subject: "Re: preventivo kit manutenzione 8.000 ore — matr. 1412",
    body:
      "Buongiorno,\n\ngrazie per la disponibilità ma per il VLM-KIT-8000H Kit manutenzione 8.000 ore VLM 2200 (matr. 1412, Bergamo) abbiamo trovato una soluzione internamente. Non procediamo con l'ordine.\n\nGrazie comunque,\nChiara Moretti",
    receivedLabel: "24/06",
    receivedFull: "24 giugno, 09:15",
    status: "persa",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-018",
    from: "Luca Bianchi",
    fromEmail: "l.bianchi@marenghi.it",
    company: "Biscottificio Marenghi S.r.l.",
    subject: "Pattino di spinta consumato, ne servono 2 — VLM 1800 0944",
    body:
      "Buongiorno,\n\npattino di spinta consumato, ne servono 2. Macchina VLM 1800 matricola 0944, Cremona, contratto service base, distinta come da parco (gr. spinta invariato rispetto a VLM 1600).\n\nCodice listino: VLM-400-022 Pattino di spinta in POM. Verificare a ogni tagliando.\n\nAttendiamo offerta.\n\nLuca Bianchi — Manutenzione",
    receivedLabel: "08:15",
    receivedFull: "Oggi, 08:15",
    status: "nuova",
    labelIds: [],
    primary: true,
  },
  {
    id: "req-019",
    from: "Anna Greco",
    fromEmail: "a.greco@lorentin.it",
    company: "Farmaceutici Lorentin S.p.A.",
    subject: "Serratura porta protezione non dà consenso — matr. 1462",
    body:
      "Buongiorno,\n\nserratura porta protezione non dà consenso. VLM 2200 matricola 1462 (Origgio), cambio formato automatico, contratto service base.\n\nDal listino: VLM-100-031 Serratura di sicurezza porta con RFID (Schneider XCSDMR79M12) — componente di sicurezza, non sostituibile con equivalenti. LT listino 25 gg, giacenza 3.\n\nUrgente per ripristinare consenso sicurezza.\n\nAnna Greco — QHSE",
    receivedLabel: "07:55",
    receivedFull: "Oggi, 07:55",
    status: "nuova",
    labelIds: ["garanzia"],
    primary: true,
  },

  // -------------------------------------------------------------
  // Tab "Altre" — non richieste ricambi, ma coerenti col contesto Vallmec
  // -------------------------------------------------------------
  {
    id: "req-010",
    from: "Ufficio Amministrazione",
    fromEmail: "amministrazione@pontenuovo.it",
    company: "Salumificio Ponte Nuovo S.p.A.",
    subject: "Sollecito pagamento fattura n. 2026/0441 (ricambi VLM-400)",
    body:
      "Spett.le Vallmec,\n\ncon la presente Vi ricordiamo che la fattura n. 2026/0441 del 15/05, importo € 2.340,00 (ordine ricambi gruppo spinta matr. 1389), risulta scaduta il 30/06.\n\nVi preghiamo di provvedere al saldo entro 5 giorni lavorativi o di inviarci la contabile.\n\nDistinti saluti,\nUfficio Amministrazione",
    receivedLabel: "10:22",
    receivedFull: "Oggi, 10:22",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "req-011",
    from: "Elena Fontanini",
    fromEmail: "e.fontanini@fontanini.it",
    company: "Dolciaria Fontanini S.r.l.",
    subject: "Conferma ricezione Offerta_2026-0417_Fontanini",
    body:
      "Buongiorno,\n\nconfermiamo di aver ricevuto il PDF Offerta_2026-0417_Fontanini relativo alla VLM 2200 matr. 1418.\n\nStiamo verificando i prezzi con il Listino ricambi Vallmec 2026 (fascia C — nessun contratto service sulla 1418). Torneremo con l'ordine a breve.\n\nCordiali saluti,\nElena Fontanini",
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
    subject: "Candidatura — Tecnico after-sales VLM 1600/1800/2200",
    body:
      "Buongiorno,\n\nmi chiamo Luca Mariani, tecnico meccatronico con esperienza su linee di fine linea e ricambi OEM (cinghie AT10, nastratrici Siat, PLC S7-1500).\n\nVi allego il CV per posizioni field service Vallmec su parco VLM 1600 / 1800 / 2200.\n\nResto a disposizione.\n\nCordiali saluti,\nLuca Mariani",
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
    subject: "Conferma ritiro merce — DDT 8842/26 (VLM-500-001 + lame)",
    body:
      "Buongiorno,\n\nconfermiamo il ritiro presso magazzino Vallmec Castel San Giovanni previsto mercoledì 9/07 tra le 08:00 e le 12:00.\n\nRiferimento: DDT 8842/26 — colli con VLM-500-001 Testata nastrante superiore e VLM-500-011 lame, destinazione Caffè Torrefazione Sud (matr. 1441).\n\nGrazie,\nElena Russo — Ufficio Trasporti",
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
    subject: "Aggiornamento listino cuscinetti Q3 2026 — rif. VLM-CU-6205",
    body:
      "Spett.le Partner Vallmec,\n\nin allegato il nuovo listino cuscinetti valido dal 1° luglio 2026.\n\nPer il vostro codice ricambio VLM-CU-6205 (6205-2RS1) e VLM-200-011 (UCF 205) i costi di acquisto restano allineati all'estrazione gestionale del 15/07/2026 usata nel Listino_ricambi_Vallmec_2026.\n\nCordiali saluti,\nMarco Ferretti — Area Commerciale",
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
      "È stato rilevato un nuovo accesso all'account service@vallmec.demo da Windows, Castel San Giovanni (PC), IT.\n\nSe eravate Voi, ignorate questo messaggio. In caso contrario, verificate l'attività recente e cambiate la password.\n\nQuesto è un messaggio automatico, non rispondere.",
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
    subject: "Appuntamento revisione annuale — matr. 1301 / 1364 / 1395",
    body:
      "Buongiorno,\n\nvorremmo fissare la revisione annuale programmata per le VLM 2200 a Bobbio (PC):\n- 1301 (service full)\n- 1364 (service base)\n- 1395 (service base + teleassistenza VPN)\n\nCome da Parco_installato_Vallmec (estrazione 15/07/2026). Disponibilità settimana 14–18 luglio, preferenza mattina.\n\nNon è una richiesta di ricambi: solo intervento di controllo previsto da contratto.\n\nGrazie,\nSilvia Neri",
    receivedLabel: "23/06",
    receivedFull: "23 giugno, 16:40",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
];
