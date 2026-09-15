import type { KnowledgeEntry } from "./knowledgeTypes";

/** Schede demo Manuale per la company Dematic (catalogo Radwell). */
export const DEMATIC_KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  {
    id: "KB-D201",
    machineModel: "Sorter Multishuttle",
    machineSerial: "DC-VR-12",
    problemCategory: "troubleshooting",
    symptom:
      "Rumore e gioco sul tenditore della cinghia dentata del conveyor sorter — pignone idler usurato.",
    probableCause:
      "Usura dei denti e della sede sul pignone tenditore timing belt 8M (passo P29). Codice catalogo spesso obsoleto o sostituito.",
    solution:
      "Ispezionare il tenditore sulla baia interessata. Sostituire GBTK000018 (Sprocket, timing belt idler, 8M, pitch P29). Verificare allineamento cinghia e tensionamento dopo il montaggio. Se il codice risulta fuori produzione, quotare l'equivalente Radwell Dematic stesso passo/foro.",
    spareParts: [
      {
        code: "GBTK000018",
        description: "Sprocket, timing belt idler, 8M, pitch P29",
      },
    ],
    frequency: 4,
    consolidated: true,
    createdLabel: "12 mar",
    createdFull: "12 mar 2026",
    updatedFull: "28 ago 2026",
    tags: [
      "pignone",
      "sprocket",
      "multishuttle",
      "cinghia",
      "verona",
      "gbtk000018",
    ],
  },
  {
    id: "KB-D202",
    machineModel: "Linea conveyor magazzino automatico",
    machineSerial: "DC-NO-03",
    problemCategory: "ricambio",
    symptom:
      "Assieme pignone/albero usurato (denti e sede albero) sulla linea conveyor.",
    probableCause:
      "Fine vita dell'assieme sprocket/shaft: denti consumati e gioco sulla sede albero, con rischio di slittamento catena.",
    solution:
      "Sostituire l'assieme completo 14067P-001 (Sprocket/Shaft Assembly). Non riparare solo il pignone se la sede albero è ovalizzata. Collaudo a vuoto e sotto carico dopo il montaggio. Quantità tipica su contratto service Novara: 2 pz.",
    spareParts: [
      {
        code: "14067P-001",
        description: "Sprocket/Shaft Assembly",
      },
    ],
    frequency: 3,
    consolidated: true,
    createdLabel: "4 apr",
    createdFull: "4 apr 2026",
    updatedFull: "19 ago 2026",
    tags: [
      "sprocket",
      "albero",
      "conveyor",
      "novara",
      "14067p-001",
    ],
  },
  {
    id: "KB-D203",
    machineModel: "Conveyor DC",
    machineSerial: "DC-PR-07",
    problemCategory: "ricambio",
    symptom:
      "Pignone acciaio 15 denti consumato sul conveyor — rumore in avvio e slittamento catena.",
    probableCause:
      "Usura dei denti sul pignone Siemens 15T, foro 1-7/16\". Sostituzione programmata tipica sui DC a scorrimento continuo.",
    solution:
      "Ordinare 04811-51528 (Sprocket, steel, 15 teeth, 1-7/16 inch bore). Allineare catena e verificare pignone condotto speculare. Lotto minimo consigliato in scorta sito: 4 pz.",
    spareParts: [
      {
        code: "04811-51528",
        description: "Sprocket, steel, 15 teeth, 1-7/16 inch bore",
      },
    ],
    frequency: 5,
    consolidated: true,
    createdLabel: "21 gen",
    createdFull: "21 gen 2026",
    updatedFull: "2 set 2026",
    tags: ["pignone", "siemens", "parma", "04811-51528", "catena"],
  },
  {
    id: "KB-D204",
    machineModel: "Sorter Multishuttle",
    machineSerial: "DC-VR-08",
    problemCategory: "troubleshooting",
    symptom:
      "Fotocellula baia sorter: falso segnale presenza / non rileva il colli in ingresso.",
    probableCause:
      "Ottica sporca, disallineamento dopo intervento meccanico, oppure elemento fotoelettrico fuori specifica.",
    solution:
      "Pulire ottiche e verificare allineamento emettitore/ricevitore. Se il LED non commuta, sostituire il sensore della baia dal catalogo Radwell Dematic e ricontrollare l'ingresso PLC. Non usare equivalenti generici su baie in contratto service.",
    spareParts: [],
    frequency: 3,
    consolidated: false,
    createdLabel: "9 mag",
    createdFull: "9 mag 2026",
    updatedFull: "9 mag 2026",
    tags: ["fotocellula", "sorter", "baia", "plc", "colli"],
  },
  {
    id: "KB-D205",
    machineModel: "Linea conveyor magazzino automatico",
    machineSerial: "DC-NO-11",
    problemCategory: "troubleshooting",
    symptom:
      "Rullo motorizzato bloccato o rumoroso — accumulo colli a monte della zona.",
    probableCause:
      "Cuscinetti rullo in fine vita o corpo rullo ovalizzato; possibile trascinamento della zona ad accumulo.",
    solution:
      "Isolare la zona, verificare rotazione a mano e gioco laterale. Sostituire il rullo dal catalogo Radwell della tratta. Dopo il montaggio, controllare quota e scorrimento dei colli per 10 cicli.",
    spareParts: [],
    frequency: 2,
    consolidated: false,
    createdLabel: "16 giu",
    createdFull: "16 giu 2026",
    updatedFull: "16 giu 2026",
    tags: ["rullo", "conveyor", "accumulo", "rumore"],
  },
];
