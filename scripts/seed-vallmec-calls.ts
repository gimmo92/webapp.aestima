import "dotenv/config";
import { hashPassword } from "../lib/auth/password";
import { prisma } from "../lib/prisma";

const PREFIX = "vlm-demo-";

function stamp(date: Date) {
  const createdLabel = date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const createdFull = date.toLocaleString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { createdLabel, createdFull, updatedFull: createdFull };
}

const DEMO_PASSWORD = "VallmecDemo1!";

const demoUsers = [
  { email: "giulia.ferri@vallmec.demo", name: "Giulia Ferri", department: "ufficio_tecnico" },
  { email: "marco.sala@vallmec.demo", name: "Marco Sala", department: "ufficio_tecnico" },
  { email: "chiara.neri@vallmec.demo", name: "Chiara Neri", department: "logistica" },
  { email: "davide.colombo@vallmec.demo", name: "Davide Colombo", department: "logistica" },
  { email: "elena.riva@vallmec.demo", name: "Elena Riva", department: "commerciale" },
  { email: "luca.bianchi@vallmec.demo", name: "Luca Bianchi", department: "commerciale" },
];

const customers = [
  {
    id: `${PREFIX}cust-fontanini`,
    name: "Fontanini Packaging",
    contactName: "Elena Fontanini",
    email: "elena.fontanini@fontanini.example",
    phone: "+39 0521 440 218",
    city: "Parma",
  },
  {
    id: `${PREFIX}cust-torrefazione`,
    name: "Caffè Torrefazione Sud",
    contactName: "Marco Esposito",
    email: "marco.esposito@torrefazionesud.example",
    phone: "+39 081 552 9044",
    city: "Napoli",
  },
  {
    id: `${PREFIX}cust-origgio`,
    name: "Logistica Origgio",
    contactName: "Andrea Conti",
    email: "andrea.conti@logoriggio.example",
    phone: "+39 02 967 1180",
    city: "Origgio",
  },
  {
    id: `${PREFIX}cust-molini`,
    name: "Molini Padani",
    contactName: "Sara Bellini",
    email: "sara.bellini@molinipadani.example",
    phone: "+39 0376 441 902",
    city: "Mantova",
  },
  {
    id: `${PREFIX}cust-brescia`,
    name: "Cartotecnica Brescia",
    contactName: "Paolo Gatti",
    email: "paolo.gatti@cartobrescia.example",
    phone: "+39 030 778 2210",
    city: "Brescia",
  },
];

const tickets = [
  {
    id: `${PREFIX}tkt-01`,
    customerId: customers[0].id,
    department: "ufficio_tecnico",
    priority: "alta",
    source: "telefono",
    category: "troubleshooting",
    summary: "VLM 2200: cartone che non chiude sul lato destro",
    description:
      "In chiamata Elena Fontanini segnala che sulla VLM 2200 matricola 1418 il cartone resta aperto sul lato destro. Sospetta le ventose del gruppo formazione.",
    machineModel: "VLM 2200",
    machineSerial: "1418",
    callId: `${PREFIX}call-01`,
  },
  {
    id: `${PREFIX}tkt-02`,
    customerId: customers[1].id,
    department: "logistica",
    priority: "normale",
    source: "telefono",
    category: "pezzo_mancante",
    summary: "Manca la testata nastrante per la matricola 1441",
    description:
      "Marco Esposito conferma che nel colli in arrivo manca la testata nastrante superiore VLM-500-001 prevista per la VLM 1800 matricola 1441.",
    machineModel: "VLM 1800",
    machineSerial: "1441",
    callId: `${PREFIX}call-02`,
  },
  {
    id: `${PREFIX}tkt-03`,
    customerId: customers[2].id,
    department: "ufficio_tecnico",
    priority: "normale",
    source: "telefono",
    category: "ricambio",
    summary: "Sensore finecorsa slitta da sostituire",
    description:
      "Andrea Conti chiede il ricambio del sensore finecorsa induttivo M12 sulla VLM 2200 matricola 1432, contratto service full.",
    machineModel: "VLM 2200",
    machineSerial: "1432",
    callId: `${PREFIX}call-03`,
  },
  {
    id: `${PREFIX}tkt-04`,
    customerId: customers[0].id,
    department: "commerciale",
    priority: "normale",
    source: "telefono",
    category: "integrazione_ordine",
    summary: "Integrazione ordine ventose D.50",
    description:
      "Fontanini chiede di aggiungere 6 ventose VLM-300-004 all'ordine già aperto per la matricola 1418, fascia listino C.",
    machineModel: "VLM 2200",
    machineSerial: "1418",
    callId: `${PREFIX}call-04`,
  },
  {
    id: `${PREFIX}tkt-05`,
    customerId: customers[1].id,
    department: "ufficio_tecnico",
    priority: "alta",
    source: "telefono",
    category: "supporto_montaggio",
    summary: "Dubbio sul fissaggio del telaio al basamento",
    description:
      "In cantiere a Napoli l'installatore non è sicuro della sequenza di fissaggio del telaio. Chiede i passi e la coppia delle viti del basamento.",
    machineModel: "VLM 1800",
    machineSerial: "1441",
    callId: `${PREFIX}call-05`,
  },
  {
    id: `${PREFIX}tkt-06`,
    customerId: customers[2].id,
    department: "logistica",
    priority: "normale",
    source: "telefono",
    category: "reso",
    summary: "Reso cinghia AT10 non conforme",
    description:
      "Origgio vuole rendere una cinghia AT10 arrivata con passo diverso da quello in distinta per la matricola 1432.",
    machineModel: "VLM 2200",
    machineSerial: "1432",
    callId: `${PREFIX}call-06`,
  },
  {
    id: `${PREFIX}tkt-07`,
    customerId: customers[3].id,
    department: "ufficio_tecnico",
    priority: "alta",
    source: "telefono",
    category: "troubleshooting",
    summary: "Allarme nastro sulla VLM 1800 matricola 1475",
    description:
      "Sara Bellini segnala allarme nastro ripetuto sulla VLM 1800 matricola 1475. Il ciclo si ferma dopo poche scatole.",
    machineModel: "VLM 1800",
    machineSerial: "1475",
    callId: `${PREFIX}call-08`,
  },
  {
    id: `${PREFIX}tkt-08`,
    customerId: customers[0].id,
    department: "ufficio_tecnico",
    priority: "normale",
    source: "manuale",
    category: "troubleshooting",
    summary: "Rumore sul gruppo spinta, matricola 1389",
    description:
      "Il cliente sente un rumore metallico sul gruppo spinta della VLM 2200 matricola 1389, soprattutto a velocità alta.",
    machineModel: "VLM 2200",
    machineSerial: "1389",
    callId: null,
  },
  {
    id: `${PREFIX}tkt-09`,
    customerId: customers[2].id,
    department: "ufficio_tecnico",
    priority: "alta",
    source: "telefono",
    category: "troubleshooting",
    summary: "PLC in fault a fine ciclo, matricola 1412",
    description:
      "Andrea Conti vede il PLC andare in fault a fine ciclo sulla matricola 1412. Chiede un tecnico dell'ufficio tecnico.",
    machineModel: "VLM 2200",
    machineSerial: "1412",
    callId: `${PREFIX}call-09`,
  },
  {
    id: `${PREFIX}tkt-10`,
    customerId: customers[4].id,
    department: "ufficio_tecnico",
    priority: "normale",
    source: "telefono",
    category: "supporto_montaggio",
    summary: "Sequenza di montaggio delle piastre laterali",
    description:
      "In cantiere a Brescia chiedono l'ordine di fissaggio delle piastre laterali sulla VLM 1800 matricola 1502.",
    machineModel: "VLM 1800",
    machineSerial: "1502",
    callId: `${PREFIX}call-10`,
  },
  {
    id: `${PREFIX}tkt-11`,
    customerId: customers[1].id,
    department: "logistica",
    priority: "normale",
    source: "telefono",
    category: "pezzo_mancante",
    summary: "DDT lame in ritardo per la matricola 1441",
    description:
      "Le lame VLM-500-011 previste nel DDT 8842 non sono nel collo arrivato a Napoli. Logistica deve rispedirle.",
    machineModel: "VLM 1800",
    machineSerial: "1441",
    callId: `${PREFIX}call-11`,
  },
  {
    id: `${PREFIX}tkt-12`,
    customerId: customers[3].id,
    department: "logistica",
    priority: "alta",
    source: "inbox",
    category: "pezzo_mancante",
    summary: "Collo danneggiato: cinghia AT10 da sostituire",
    description:
      "Il corriere ha consegnato a Mantova un collo aperto. La cinghia AT10 è inutilizzabile e va riemessa.",
    machineModel: "VLM 1800",
    machineSerial: "1475",
    callId: null,
  },
  {
    id: `${PREFIX}tkt-13`,
    customerId: customers[0].id,
    department: "logistica",
    priority: "normale",
    source: "manuale",
    category: "integrazione_ordine",
    summary: "Verifica giacenza ventose D.50",
    description:
      "Prima di confermare le 6 ventose VLM-300-004 per Fontanini, logistica deve controllare la giacenza a magazzino.",
    machineModel: "VLM 2200",
    machineSerial: "1418",
    callId: null,
  },
  {
    id: `${PREFIX}tkt-14`,
    customerId: customers[4].id,
    department: "logistica",
    priority: "normale",
    source: "telefono",
    category: "reso",
    summary: "Reso ventose con diametro errato",
    description:
      "Cartotecnica Brescia rende un sacchetto di ventose arrivate D.40 invece di D.50. Va aperto il reso e il reinvio.",
    machineModel: "VLM 1800",
    machineSerial: "1502",
    callId: `${PREFIX}call-12`,
  },
  {
    id: `${PREFIX}tkt-15`,
    customerId: customers[2].id,
    department: "commerciale",
    priority: "normale",
    source: "telefono",
    category: "ricambio",
    summary: "Preventivo sensori finecorsa, fascia A",
    description:
      "Origgio chiede il preventivo di due sensori VLM-400-030 in fascia A, contratto service full sulla 1432.",
    machineModel: "VLM 2200",
    machineSerial: "1432",
    callId: `${PREFIX}call-13`,
  },
  {
    id: `${PREFIX}tkt-16`,
    customerId: customers[0].id,
    department: "commerciale",
    priority: "normale",
    source: "inbox",
    category: "altro",
    summary: "Aggiornare l'offerta Fontanini al listino 2026",
    description:
      "Elena Fontanini chiede di ricalcolare Offerta_2026-0417 con il listino ricambi 2026, fascia C, matricola 1418.",
    machineModel: "VLM 2200",
    machineSerial: "1418",
    callId: null,
  },
  {
    id: `${PREFIX}tkt-17`,
    customerId: customers[1].id,
    department: "commerciale",
    priority: "alta",
    source: "telefono",
    category: "integrazione_ordine",
    summary: "Conferma ordine testata nastrante",
    description:
      "Torrefazione Sud vuole conferma scritta e prezzo della testata VLM-500-001 prima di autorizzare la spedizione.",
    machineModel: "VLM 1800",
    machineSerial: "1441",
    callId: `${PREFIX}call-14`,
  },
  {
    id: `${PREFIX}tkt-18`,
    customerId: customers[3].id,
    department: "commerciale",
    priority: "normale",
    source: "manuale",
    category: "altro",
    summary: "Proposta rinnovo contratto service full",
    description:
      "Molini Padani è in scadenza sul contratto della matricola 1475. Commerciale prepara il rinnovo full.",
    machineModel: "VLM 1800",
    machineSerial: "1475",
    callId: null,
  },
];

const calls = [
  {
    id: `${PREFIX}call-01`,
    externalId: `${PREFIX}call-01`,
    phone: customers[0].phone,
    durationSec: 246,
    outcome: "answered",
    ticketId: tickets[0].id,
    hoursAgo: 5,
    transcript:
      "Centralino Vallmec, buongiorno.\nElena Fontanini, Parma, matricola 1418.\nIl cartone non si chiude sul lato destro, penso siano le ventose.\nOk, apro il ticket e lo assegno all'ufficio tecnico.\nGrazie, resto in attesa.",
  },
  {
    id: `${PREFIX}call-02`,
    externalId: `${PREFIX}call-02`,
    phone: customers[1].phone,
    durationSec: 188,
    outcome: "answered",
    ticketId: tickets[1].id,
    hoursAgo: 8,
    transcript:
      "Buongiorno, sono Marco Esposito della Torrefazione Sud.\nNel collo di mercoledì manca la testata nastrante VLM-500-001 per la 1441.\nLa segno in logistica e le mando la conferma dell'ordine integrativo.\nPerfetto, grazie.",
  },
  {
    id: `${PREFIX}call-03`,
    externalId: `${PREFIX}call-03`,
    phone: customers[2].phone,
    durationSec: 132,
    outcome: "answered",
    ticketId: tickets[2].id,
    hoursAgo: 26,
    transcript:
      "Andrea Conti, Origgio. Sensore finecorsa della slitta, matricola 1432.\nÈ il VLM-400-030, contratto full.\nLo assegno e le prepariamo il ricambio.\nVa bene, attendo il DDT.",
  },
  {
    id: `${PREFIX}call-04`,
    externalId: `${PREFIX}call-04`,
    phone: customers[0].phone,
    durationSec: 97,
    outcome: "answered",
    ticketId: tickets[3].id,
    hoursAgo: 30,
    transcript:
      "Sempre Fontanini. Oltre al guasto, ci servono sei ventose D.50, codice VLM-300-004.\nLe metto come integrazione ordine, fascia C.\nSì, stesso riferimento della 1418.",
  },
  {
    id: `${PREFIX}call-05`,
    externalId: `${PREFIX}call-05`,
    phone: customers[1].phone,
    durationSec: 310,
    outcome: "answered",
    ticketId: tickets[4].id,
    hoursAgo: 3,
    transcript:
      "Sono in cantiere sulla 1441. Il telaio non so se va fissato prima o dopo il basamento.\nLe apro un ticket di supporto montaggio e glielo assegno subito.\nMi richiama il tecnico con la sequenza? Sì.",
  },
  {
    id: `${PREFIX}call-06`,
    externalId: `${PREFIX}call-06`,
    phone: customers[2].phone,
    durationSec: 154,
    outcome: "answered",
    ticketId: tickets[5].id,
    hoursAgo: 50,
    transcript:
      "Conti di nuovo. La cinghia AT10 che ci avete mandato ha il passo sbagliato.\nLa prendiamo come reso e verifichiamo la distinta della 1432.\nGrazie, la tengo da parte.",
  },
  {
    id: `${PREFIX}call-07`,
    externalId: `${PREFIX}call-07`,
    phone: "+39 347 220 1188",
    durationSec: 0,
    outcome: "missed",
    ticketId: null,
    hoursAgo: 1,
    transcript: null,
  },
  {
    id: `${PREFIX}call-08`,
    externalId: `${PREFIX}call-08`,
    phone: customers[3].phone,
    durationSec: 205,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-07`,
    hoursAgo: 6,
    transcript:
      "Sara Bellini, Molini Padani. Sulla 1475 scatta l'allarme nastro ogni pochi cicli.\nLo passo all'ufficio tecnico, le assegnano Giulia o Marco.\nGrazie, resto in linea con il tecnico.",
  },
  {
    id: `${PREFIX}call-09`,
    externalId: `${PREFIX}call-09`,
    phone: customers[2].phone,
    durationSec: 176,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-09`,
    hoursAgo: 14,
    transcript:
      "Conti, matricola 1412. Il PLC va in fault quando chiude il ciclo.\nApro il ticket e lo metto sull'ufficio tecnico.\nVa bene, aspetto la chiamata.",
  },
  {
    id: `${PREFIX}call-10`,
    externalId: `${PREFIX}call-10`,
    phone: customers[4].phone,
    durationSec: 240,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-10`,
    hoursAgo: 4,
    transcript:
      "Paolo Gatti da Brescia, siamo in montaggio sulla 1502.\nLe piastre laterali: prima il basamento o prima le piastre?\nGlielo assegno all'ufficio tecnico, le richiamano con la sequenza.",
  },
  {
    id: `${PREFIX}call-11`,
    externalId: `${PREFIX}call-11`,
    phone: customers[1].phone,
    durationSec: 121,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-11`,
    hoursAgo: 9,
    transcript:
      "Esposito. Le lame del DDT 8842 non sono nel collo.\nLo giro in logistica, così rispediscono il mancante.\nPerfetto.",
  },
  {
    id: `${PREFIX}call-12`,
    externalId: `${PREFIX}call-12`,
    phone: customers[4].phone,
    durationSec: 98,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-14`,
    hoursAgo: 20,
    transcript:
      "Gatti. Le ventose arrivate sono D.40, a noi servivano D.50.\nApro il reso e lo assegno a logistica.\nLe teniamo da parte.",
  },
  {
    id: `${PREFIX}call-13`,
    externalId: `${PREFIX}call-13`,
    phone: customers[2].phone,
    durationSec: 143,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-15`,
    hoursAgo: 11,
    transcript:
      "Conti. Mi serve il preventivo di due finecorsa, fascia A, contratto full.\nLo passo al commerciale.\nAttendo il PDF.",
  },
  {
    id: `${PREFIX}call-14`,
    externalId: `${PREFIX}call-14`,
    phone: customers[1].phone,
    durationSec: 166,
    outcome: "answered",
    ticketId: `${PREFIX}tkt-17`,
    hoursAgo: 2,
    transcript:
      "Esposito di nuovo. Prima di far partire la testata nastrante voglio prezzo e conferma ordine.\nLo assegno al commerciale, le scrivono oggi.\nGrazie.",
  },
];

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true },
  });
  const company = companies.find(
    (row) => /vallmec/i.test(row.name) || /vallmec/i.test(row.slug)
  );
  if (!company) {
    throw new Error(
      `Company Vallmec non trovata. Presenti: ${companies
        .map((row) => `${row.name} (${row.slug})`)
        .join(", ") || "nessuna"}`
    );
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  for (const demo of demoUsers) {
    await prisma.user.upsert({
      where: { email: demo.email },
      update: {
        name: demo.name,
        department: demo.department,
        companyId: company.id,
      },
      create: {
        email: demo.email,
        name: demo.name,
        department: demo.department,
        role: "MEMBER",
        passwordHash,
        companyId: company.id,
      },
    });
  }

  const users = await prisma.user.findMany({
    where: { email: { in: demoUsers.map((demo) => demo.email) } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, department: true },
  });
  const byDepartment = new Map<string, { id: string; name: string }[]>();
  for (const user of users) {
    const key = user.department ?? "";
    const list = byDepartment.get(key) ?? [];
    list.push(user);
    byDepartment.set(key, list);
  }

  await prisma.phoneCall.deleteMany({
    where: { companyId: company.id, externalId: { startsWith: PREFIX } },
  });
  await prisma.serviceTicket.deleteMany({
    where: { companyId: company.id, id: { startsWith: PREFIX } },
  });
  await prisma.customer.deleteMany({
    where: { companyId: company.id, id: { startsWith: PREFIX } },
  });

  for (const customer of customers) {
    await prisma.customer.create({
      data: { ...customer, companyId: company.id },
    });
  }

  const now = Date.now();
  const assignedTo = new Map<string, string>();
  const deptCursor = new Map<string, number>();
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const pool = byDepartment.get(ticket.department) ?? users;
    const cursor = deptCursor.get(ticket.department) ?? 0;
    const operator = pool[cursor % pool.length];
    deptCursor.set(ticket.department, cursor + 1);
    assignedTo.set(ticket.id, operator.name);
    const when = new Date(now - (index + 2) * 3 * 60 * 60 * 1000);
    const times = stamp(when);
    const customer = customers.find((row) => row.id === ticket.customerId);
    await prisma.serviceTicket.create({
      data: {
        id: ticket.id,
        companyId: company.id,
        status: "assegnato",
        priority: ticket.priority,
        source: ticket.source,
        category: ticket.category,
        summary: ticket.summary,
        description: ticket.description,
        machineModel: ticket.machineModel,
        machineSerial: ticket.machineSerial,
        assignedTechnicianId: operator.id,
        department: ticket.department,
        customerId: ticket.customerId,
        customerName: customer?.contactName,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        customerCompany: customer?.name,
        createdLabel: times.createdLabel,
        createdFull: times.createdFull,
        updatedFull: times.updatedFull,
        createdAt: when,
      },
    });
  }

  for (const call of calls) {
    const operatorName = call.ticketId
      ? assignedTo.get(call.ticketId) ?? users[0].name
      : users[0].name;
    const occurredAt = new Date(now - call.hoursAgo * 60 * 60 * 1000);
    await prisma.phoneCall.create({
      data: {
        id: call.id,
        companyId: company.id,
        externalId: call.externalId,
        direction: "inbound",
        phone: call.phone,
        durationSec: call.durationSec,
        outcome: call.outcome,
        transcript: call.transcript,
        operatorName,
        occurredAt,
        ticketId: call.ticketId,
      },
    });
  }

  console.log(
    `Vallmec (${company.slug}): ${users.length} utenti con reparto, ${tickets.length} ticket assegnati allo stesso reparto, ${calls.length} chiamate. Password demo: ${DEMO_PASSWORD}`
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
