import type { PartRequest } from "./inboxTypes";

/** Email demo inbox ticketing Dematic — ricambi catalogo Radwell. */
export const DEMATIC_INBOX_EMAILS: PartRequest[] = [
  {
    id: "dematic-req-001",
    from: "Marco Benedetti",
    fromEmail: "m.benedetti@interportoverona.it",
    company: "Interporto Verona Logistica S.p.A.",
    subject: "Sostituzione pignone GBTK000018 — sorter Multishuttle",
    body:
      "Buongiorno,\n\nsul conveyor del sorter Multishuttle (baia 12, DC Verona) il pignone della cinghia dentata è usurato: rumore e gioco evidente sul tenditore.\n\nDal catalogo ricambi Dematic / Radwell il codice dovrebbe essere GBTK000018 — Sprocket, timing belt idler, 8M, pitch P29. Vi allego la foto del pezzo smontato sul banco, accanto al riduttore Bonfiglioli.\n\nCi hanno detto che il codice potrebbe essere obsoleto: ci serve una sostituzione (stesso pezzo se ancora disponibile, oppure un equivalente compatibile). Linea in deroga, preventivo e lead time il prima possibile.\n\nGrazie,\nMarco Benedetti — Manutenzione Impianto",
    receivedLabel: "10:14",
    receivedFull: "Oggi, 10:14",
    status: "nuova",
    labelIds: ["cliente_chiave"],
    primary: true,
    attachments: [
      {
        name: "GBTK000018-pignone-banco.png",
        url: "/richieste/gbtk000018.png",
        kind: "image",
      },
    ],
  },
  {
    id: "dematic-req-002",
    from: "Elena Riva",
    fromEmail: "e.riva@lognord.it",
    company: "LogNord Distribution S.r.l.",
    subject: "Serve sostituto sprocket/shaft 14067P-001 — linea conveyor",
    body:
      "Salve,\n\nci serve sostituire l'assieme pignone/albero sulla linea conveyor del magazzino automatico a Novara. Codice a catalogo Radwell Dematic: 14067P-001 — Sprocket/Shaft Assembly.\n\nIl pezzo attuale è usurato (denti e sede albero). Potete confermare se è ancora disponibile a listino o indicarci un sostituto equivalente? Quantità: 2 pz, contratto service sul sito Novara.\n\nRestiamo in attesa di offerta e tempi di consegna.\n\nCordiali saluti,\nElena Riva — Ufficio Tecnico",
    receivedLabel: "09:38",
    receivedFull: "Oggi, 09:38",
    status: "nuova",
    labelIds: [],
    primary: true,
  },
];
