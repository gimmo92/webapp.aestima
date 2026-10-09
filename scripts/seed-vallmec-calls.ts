import "dotenv/config";
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
];

const calls = [
  {
    id: `${PREFIX}call-01`,
    externalId: `${PREFIX}call-01`,
    phone: customers[0].phone,
    durationSec: 246,
    outcome: "answered",
    operatorOffset: 0,
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
    operatorOffset: 1,
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
    operatorOffset: 0,
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
    operatorOffset: 2,
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
    operatorOffset: 1,
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
    operatorOffset: 2,
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
    operatorOffset: 0,
    ticketId: null,
    hoursAgo: 1,
    transcript: null,
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

  const users = await prisma.user.findMany({
    where: { companyId: company.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  if (users.length === 0) {
    throw new Error(`Nessun utente in ${company.name}: non posso assegnare i ticket.`);
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
  for (let index = 0; index < tickets.length; index += 1) {
    const ticket = tickets[index];
    const operator = users[index % users.length];
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
    const operator = users[call.operatorOffset % users.length];
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
        operatorName: operator.name,
        occurredAt,
        ticketId: call.ticketId,
      },
    });
  }

  console.log(
    `Vallmec (${company.slug}): ${tickets.length} ticket assegnati, ${calls.length} chiamate, operatori ${users.map((user) => user.name).join(", ")}`
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
