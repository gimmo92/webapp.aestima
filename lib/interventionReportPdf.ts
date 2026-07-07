import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFForm, type PDFPage } from "pdf-lib";
import { COMPANY } from "@/lib/mockData";
import {
  REPORT_OUTCOME_BY_ID,
  REPORT_TYPE_BY_ID,
} from "@/lib/technicianData";
import type { InterventionReport } from "@/lib/technicianTypes";

const PAGE = { w: 595.28, h: 841.89 };
const M = 48;
const CONTENT_W = PAGE.w - M * 2;

export function interventionReportPdfFilename(report: InterventionReport): string {
  const safe = report.reportNumber.replace(/[^\w-]+/g, "_");
  return `Rapporto_${safe}.pdf`;
}

export async function buildInterventionReportPdf(
  report: InterventionReport,
  technicianName: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Rapporto intervento ${report.reportNumber}`);
  pdfDoc.setAuthor(COMPANY.name);
  pdfDoc.setSubject(report.summary);

  const page = pdfDoc.addPage([PAGE.w, PAGE.h]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const form = pdfDoc.getForm();
  const prefix = report.id;

  let y = PAGE.h - M;

  y = drawHeader(page, font, fontBold, report, y);
  y -= 16;

  y = drawSectionTitle(page, fontBold, "Dati intervento", y);
  y -= 8;

  y = addRowFields(form, page, font, prefix, y, [
    { name: "reportNumber", label: "N. rapporto", value: report.reportNumber, width: 0.34 },
    { name: "interventionDate", label: "Data intervento", value: report.interventionDateFull, width: 0.66 },
  ]);

  y = addRowFields(form, page, font, prefix, y, [
    { name: "machineModel", label: "Macchina / modello", value: report.machineModel, width: 0.58 },
    { name: "machineSerial", label: "Matricola", value: report.machineSerial, width: 0.42 },
  ]);

  y = addRowFields(form, page, font, prefix, y, [
    { name: "technician", label: "Tecnico", value: technicianName, width: 0.5 },
    { name: "hours", label: "Ore uomo", value: String(report.hours), width: 0.18 },
    {
      name: "type",
      label: "Tipologia",
      value: REPORT_TYPE_BY_ID[report.type]?.label ?? report.type,
      width: 0.32,
    },
  ]);

  y = addRowFields(form, page, font, prefix, y, [
    {
      name: "outcome",
      label: "Esito",
      value: REPORT_OUTCOME_BY_ID[report.outcome]?.label ?? report.outcome,
      width: 0.34,
    },
    {
      name: "customer",
      label: "Cliente",
      value: report.customerCompany ?? "",
      width: 0.66,
    },
  ]);

  y -= 10;
  y = drawSectionTitle(page, fontBold, "Sintesi", y);
  y -= 8;
  y = addMultilineField(form, page, font, prefix, "summary", y, 44, report.summary);

  y -= 10;
  y = drawSectionTitle(page, fontBold, "Lavori eseguiti", y);
  y -= 8;
  y = addMultilineField(form, page, font, prefix, "workPerformed", y, 120, report.workPerformed);

  y -= 10;
  y = drawSectionTitle(page, fontBold, "Ricambi utilizzati", y);
  y -= 8;
  y = addMultilineField(
    form,
    page,
    font,
    prefix,
    "partsUsed",
    y,
    52,
    (report.partsUsed ?? []).join(", ")
  );

  y -= 10;
  y = drawSectionTitle(page, fontBold, "Note aggiuntive", y);
  y -= 8;
  y = addMultilineField(form, page, font, prefix, "notes", y, 52, "");

  y -= 14;
  y = drawSectionTitle(page, fontBold, "Firme", y);
  y -= 8;
  addRowFields(form, page, font, prefix, y, [
    { name: "signatureTech", label: "Firma tecnico", value: "", width: 0.5 },
    { name: "signatureClient", label: "Firma cliente", value: "", width: 0.5 },
  ]);

  page.drawText(
    "PDF con campi compilabili — apri in Adobe Acrobat, Foxit o lettore compatibile AcroForm.",
    { x: M, y: 28, size: 7.5, font, color: rgb(0.45, 0.45, 0.45) }
  );

  form.updateFieldAppearances(font);

  return pdfDoc.save();
}

export function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes.slice()], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function drawHeader(
  page: PDFPage,
  font: PDFFont,
  fontBold: PDFFont,
  report: InterventionReport,
  y: number
): number {
  page.drawText(COMPANY.name, { x: M, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(COMPANY.tagline, { x: M, y: y - 16, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
  page.drawText(`${COMPANY.address} · ${COMPANY.phone}`, {
    x: M,
    y: y - 28,
    size: 8,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const title = "RAPPORTO DI INTERVENTO";
  const titleW = fontBold.widthOfTextAtSize(title, 13);
  page.drawText(title, {
    x: PAGE.w - M - titleW,
    y,
    size: 13,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(report.reportNumber, {
    x: PAGE.w - M - font.widthOfTextAtSize(report.reportNumber, 10),
    y: y - 18,
    size: 10,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  page.drawLine({
    start: { x: M, y: y - 38 },
    end: { x: PAGE.w - M, y: y - 38 },
    thickness: 1,
    color: rgb(0.82, 0.82, 0.82),
  });

  return y - 48;
}

function drawSectionTitle(page: PDFPage, fontBold: PDFFont, title: string, y: number): number {
  page.drawText(title.toUpperCase(), {
    x: M,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.35, 0.35, 0.35),
  });
  return y - 12;
}

interface FieldSpec {
  name: string;
  label: string;
  value: string;
  width: number;
}

function addRowFields(
  form: PDFForm,
  page: PDFPage,
  font: PDFFont,
  prefix: string,
  y: number,
  fields: FieldSpec[]
): number {
  const rowH = 34;
  const gap = 10;
  let x = M;
  const usable = CONTENT_W - gap * (fields.length - 1);

  for (const field of fields) {
    const w = usable * field.width;
    addLabeledTextField(form, page, font, prefix, field.name, field.label, field.value, x, y - rowH, w, 22);
    x += w + gap;
  }

  return y - rowH - 10;
}

function addMultilineField(
  form: PDFForm,
  page: PDFPage,
  font: PDFFont,
  prefix: string,
  name: string,
  y: number,
  height: number,
  value: string
): number {
  const field = form.createTextField(`${prefix}_${name}`);
  field.setText(value);
  field.enableMultiline();
  field.setFontSize(10);
  field.addToPage(page, {
    x: M,
    y: y - height,
    width: CONTENT_W,
    height,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.6,
  });
  return y - height - 6;
}

function addLabeledTextField(
  form: PDFForm,
  page: PDFPage,
  font: PDFFont,
  prefix: string,
  name: string,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  page.drawText(label, { x, y: y + height + 3, size: 7.5, font, color: rgb(0.45, 0.45, 0.45) });
  const field = form.createTextField(`${prefix}_${name}`);
  field.setText(value);
  field.setFontSize(10);
  field.addToPage(page, {
    x,
    y,
    width,
    height,
    borderColor: rgb(0.75, 0.75, 0.75),
    borderWidth: 0.6,
  });
}
