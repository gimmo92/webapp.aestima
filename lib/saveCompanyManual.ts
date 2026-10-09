import { prisma } from "@/lib/prisma";
import { listCompanyManuals } from "@/lib/companyManuals";
import { resolveManualText } from "@/lib/manualExtraction";
import { formatSize } from "@/lib/uploadSourceFile";

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  text: "text/plain",
};

/**
 * Salva il manuale anche se l'estrazione del testo non riesce.
 * `warning` spiega perché il testo di un PDF non è stato estratto.
 */
export async function saveCompanyManual(
  companyId: string,
  name: string,
  buffer: Buffer
) {
  const ext = name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "pdf";
  const extracted = await resolveManualText(name, buffer);
  await prisma.companyManual.create({
    data: {
      companyId,
      name,
      mimeType: MIME[ext] ?? "application/octet-stream",
      sizeLabel: formatSize(buffer.length),
      content: new Uint8Array(buffer),
      extractedText: extracted.text,
      textExtracted: extracted.extracted,
    },
  });
  return {
    manuals: await listCompanyManuals(companyId),
    warning: extracted.error,
  };
}
