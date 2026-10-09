import { prisma } from "@/lib/prisma";
import { listCompanyManuals } from "@/lib/companyManuals";
import { extractManualText } from "@/lib/manualText";
import { formatSize } from "@/lib/uploadSourceFile";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  text: "text/plain",
};

function safeText(value: string): string {
  return value
    .replace(/\u0000/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, "")
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

/** Salva il manuale anche se l'estrazione del testo non riesce. */
export async function saveCompanyManual(
  companyId: string,
  name: string,
  buffer: Buffer
) {
  const ext = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "pdf";
  let extracted = { text: "", extracted: false };
  try {
    extracted = extractManualText(name, buffer);
  } catch (error) {
    console.error("extract manual", name, error);
  }
  await prisma.companyManual.create({
    data: {
      companyId,
      name,
      mimeType: MIME[ext] ?? "application/octet-stream",
      sizeLabel: formatSize(buffer.length),
      content: new Uint8Array(buffer),
      extractedText: safeText(extracted.text),
      textExtracted: extracted.extracted,
    },
  });
  return listCompanyManuals(companyId);
}
