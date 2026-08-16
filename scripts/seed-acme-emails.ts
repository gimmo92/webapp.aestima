import "dotenv/config";
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/auth/password";
import { DEFAULT_LABELS } from "../lib/inboxData";
import type { PartRequest } from "../lib/inboxTypes";

const OWNER_EMAIL = "gbasso@aftercore.ai";
const COMPANY_NAME = "Acme S.p.A.";
const COMPANY_SLUG = "acme";

const ACME_EMAILS: PartRequest[] = [
  {
    id: "acme-req-001",
    from: "Giulia Ferri",
    fromEmail: "g.ferri@nordpack.it",
    company: "Nordpack S.r.l.",
    subject: "Cinghia nastro uscita usurata — linea ACM-2400 matr. A-1182",
    body:
      "Buongiorno,\n\ncinghia del nastro di uscita usurata, linea ferma a tratti. Macchina ACM-2400 matricola A-1182, stabilimento Brescia.\n\nDal catalogo ricambi Acme 2026 dovrebbe essere ACM-NT-4410 (cinghia PU dentata 25 mm). Serve preventivo urgente e disponibilità a magazzino.\n\nGrazie,\nGiulia Ferri — Manutenzione",
    receivedLabel: "09:18",
    receivedFull: "Oggi, 09:18",
    status: "nuova",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "acme-req-002",
    from: "Davide Longo",
    fromEmail: "d.longo@italcarni.it",
    company: "Italcarni S.p.A.",
    subject: "Fotocellula ingresso non legge il prodotto — ACM-1800 0744",
    body:
      "Salve,\n\nla fotocellula in ingresso non rileva più il prodotto. Incartonatrice ACM-1800 matricola 0744, Modena. Contratto service full.\n\nCodice sospetto: ACM-SN-2201 Fotocellula reflex. Potete quotare la sostituzione in fascia A?\n\nCordiali saluti,\nDavide Longo",
    receivedLabel: "08:41",
    receivedFull: "Oggi, 08:41",
    status: "identificata",
    labelIds: [],
    primary: true,
  },
  {
    id: "acme-req-003",
    from: "Marta Villa",
    fromEmail: "m.villa@dolcepiemonte.it",
    company: "Dolce Piemonte S.r.l.",
    subject: "Kit 2.000 ore + 2 lame nastratrice — matr. A-2210",
    body:
      "Buongiorno,\n\nci servono il kit manutenzione 2.000 ore e 2 lame per la nastratrice.\n\nMacchina: ACM-2400 matricola A-2210, Cuneo, contratto service base.\n\nCodici:\n- ACM-KIT-2000H\n- ACM-LM-5011 × 2\n\nTempi e costi netti fascia B, per favore.\n\nMarta Villa — Ufficio Tecnico",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 17:05",
    status: "attesa_fornitore",
    labelIds: [],
    primary: true,
  },
  {
    id: "acme-req-004",
    from: "Stefano Ricci",
    fromEmail: "manutenzione@caseificioalto.it",
    company: "Caseificio Alto Adige",
    subject: "Rumore sul gruppo spinta — non ricordo la matricola",
    body:
      "Salve,\n\nla nostra ACM-2400 a Bolzano ha iniziato a fare rumore sul gruppo spinta. Non ho sotto mano la matricola (potrebbe essere A-0901 o A-0914).\n\nTemiamo pattini guida o cuscinetti. Avete il parco installato? Mandatemi un preventivo indicativo.\n\nStefano Ricci",
    receivedLabel: "ieri",
    receivedFull: "Ieri, 11:40",
    status: "da_identificare",
    labelIds: ["garanzia"],
    primary: true,
  },
  {
    id: "acme-req-005",
    from: "Elena Costa",
    fromEmail: "e.costa@pharmanord.it",
    company: "Pharmanord S.p.A.",
    subject: "Sensore finecorsa slitta da sostituire — A-1550",
    body:
      "Buongiorno,\n\nsensore finecorsa slitta da sostituire. ACM-2400 matricola A-1550, Varese, contratto service full.\n\nCodice catalogo: ACM-SN-3012 Sensore induttivo M12. Inviate il preventivo fascia A.\n\nElena Costa",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 15:10",
    status: "preventivo_pronto",
    labelIds: ["cliente_chiave"],
    primary: true,
  },
  {
    id: "acme-req-006",
    from: "Paolo Gentile",
    fromEmail: "acquisti@nordpack.it",
    company: "Nordpack S.r.l.",
    subject: "Offerta tappeto modulare nastro alimentazione — A-1182",
    body:
      "Gentili,\n\nquanto costa il tappeto modulare del nastro alimentazione per ACM-2400 matr. A-1182?\n\nDal listino: ACM-NT-2002, circa 18 m. Restiamo in attesa di offerta.\n\nPaolo Gentile — Acquisti",
    receivedLabel: "lun",
    receivedFull: "Lunedì, 10:22",
    status: "inviata",
    labelIds: [],
    primary: true,
  },
  {
    id: "acme-req-007",
    from: "Chiara Esposito",
    fromEmail: "c.esposito@torrefazioneetna.it",
    company: "Torrefazione Etna",
    subject: "Testata nastrante superiore — ACM-1800 0811",
    body:
      "Buongiorno,\n\ntestata nastrante superiore da sostituire. ACM-1800 matricola 0811, Catania, contratto service base.\n\nCodice: ACM-NS-5001. Se utile aggiungete anche 2 lame ACM-LM-5011.\n\nGrazie,\nChiara Esposito",
    receivedLabel: "12/08",
    receivedFull: "12 agosto, 16:05",
    status: "vinta",
    labelIds: [],
    primary: true,
  },
  {
    id: "acme-req-008",
    from: "Luca Bianchi",
    fromEmail: "l.bianchi@italcarni.it",
    company: "Italcarni S.p.A.",
    subject: "Re: kit 8.000 ore — non procediamo",
    body:
      "Buongiorno,\n\nper il kit ACM-KIT-8000H sulla 0744 abbiamo trovato una soluzione internamente. Non procediamo con l'ordine.\n\nGrazie comunque,\nLuca Bianchi",
    receivedLabel: "10/08",
    receivedFull: "10 agosto, 09:30",
    status: "persa",
    labelIds: [],
    primary: false,
  },
  {
    id: "acme-req-009",
    from: "Anna Greco",
    fromEmail: "a.greco@pharmanord.it",
    company: "Pharmanord S.p.A.",
    subject: "Serratura porta protezione non dà consenso — A-1550",
    body:
      "Buongiorno,\n\nserratura porta protezione non dà consenso. ACM-2400 A-1550, componente di sicurezza ACM-SF-1031.\n\nUrgente per ripristinare il consenso. LT accettabile max 1 settimana.\n\nAnna Greco — QHSE",
    receivedLabel: "07:50",
    receivedFull: "Oggi, 07:50",
    status: "nuova",
    labelIds: ["garanzia"],
    primary: true,
  },
  {
    id: "acme-req-010",
    from: "Ufficio Amministrazione",
    fromEmail: "amministrazione@nordpack.it",
    company: "Nordpack S.r.l.",
    subject: "Sollecito fattura 2026/1188 — ricambi nastro A-1182",
    body:
      "Spett.le Acme S.p.A.,\n\nla fattura n. 2026/1188 del 20/06, importo € 1.890,00, risulta scaduta il 31/07.\n\nVi preghiamo di saldare entro 5 giorni o di inviare la contabile.\n\nUfficio Amministrazione Nordpack",
    receivedLabel: "10:05",
    receivedFull: "Oggi, 10:05",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "acme-req-011",
    from: "Marta Villa",
    fromEmail: "m.villa@dolcepiemonte.it",
    company: "Dolce Piemonte S.r.l.",
    subject: "Conferma ricezione offerta ACM-2026-0902",
    body:
      "Buongiorno,\n\nconfermiamo di aver ricevuto l'offerta ACM-2026-0902 per la A-2210. Stiamo verificando i prezzi internamente.\n\nCordiali saluti,\nMarta Villa",
    receivedLabel: "09:40",
    receivedFull: "Oggi, 09:40",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
  {
    id: "acme-req-012",
    from: "Google Workspace",
    fromEmail: "noreply@google.com",
    company: "Google",
    subject: "Nuovo accesso all'account Google Workspace",
    body:
      "È stato rilevato un nuovo accesso all'account service@acme.demo da Windows, Milano, IT.\n\nSe eravate Voi, ignorate questo messaggio.\n\nQuesto è un messaggio automatico, non rispondere.",
    receivedLabel: "08:02",
    receivedFull: "Oggi, 08:02",
    status: "nuova",
    labelIds: [],
    primary: false,
  },
];

function nid(companyId: string, kind: string, oldId: string) {
  return `${kind}_${companyId.slice(-10)}_${oldId}`;
}

async function ensureCompanyAndOwner() {
  const owner = await prisma.user.findUnique({
    where: { email: OWNER_EMAIL },
    include: { company: true },
  });

  if (owner) {
    if (owner.company.name !== COMPANY_NAME) {
      await prisma.company.update({
        where: { id: owner.companyId },
        data: { name: COMPANY_NAME },
      });
    }
    if (owner.role !== "OWNER") {
      await prisma.user.update({
        where: { id: owner.id },
        data: { role: "OWNER" },
      });
    }
    return { companyId: owner.companyId, createdOwner: false };
  }

  let company = await prisma.company.findFirst({
    where: {
      OR: [{ slug: COMPANY_SLUG }, { name: COMPANY_NAME }],
    },
  });

  if (!company) {
    company = await prisma.company.create({
      data: { name: COMPANY_NAME, slug: COMPANY_SLUG },
    });
  }

  await prisma.user.create({
    data: {
      email: OWNER_EMAIL,
      name: "Gianmarco Basso",
      passwordHash: await hashPassword("AcmeAftercore1!"),
      role: "OWNER",
      companyId: company.id,
    },
  });

  return { companyId: company.id, createdOwner: true };
}

async function seedAcmeEmails(companyId: string) {
  await prisma.partRequestLabel.deleteMany({
    where: { partRequest: { companyId } },
  });
  await prisma.partRequest.deleteMany({ where: { companyId } });
  await prisma.label.deleteMany({ where: { companyId } });

  const labelMap = new Map<string, string>();
  for (const l of DEFAULT_LABELS) {
    const id = nid(companyId, "lbl", l.id);
    labelMap.set(l.id, id);
    await prisma.label.create({
      data: { id, companyId, name: l.name, color: l.color },
    });
  }

  for (const r of ACME_EMAILS) {
    await prisma.partRequest.create({
      data: {
        id: nid(companyId, "req", r.id),
        companyId,
        fromName: r.from,
        fromEmail: r.fromEmail,
        customerCompany: r.company,
        subject: r.subject,
        body: r.body,
        status: r.status,
        primary: r.primary,
        receivedLabel: r.receivedLabel,
        receivedFull: r.receivedFull,
        labels: {
          create: r.labelIds
            .map((old) => labelMap.get(old))
            .filter((x): x is string => Boolean(x))
            .map((labelId) => ({ labelId })),
        },
      },
    });
  }
}

async function main() {
  const { companyId, createdOwner } = await ensureCompanyAndOwner();
  await seedAcmeEmails(companyId);

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { partRequests: true, users: true } },
      users: { select: { email: true, role: true } },
    },
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        createdOwner,
        company,
        emails: ACME_EMAILS.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
