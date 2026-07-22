import { MACHINES } from "./mockData";
import {
  BOM_CATALOG,
  bomByArchiveFile,
  isPartPriceMissing,
} from "./bomCatalog";
import { machineLabel } from "./archiveData";
import type { ArchivedDoc, SourceFile } from "./archiveTypes";

export type GapCategory = "price" | "data";

export interface ArchiveGap {
  id: string;
  category: GapCategory;
  severity: "error" | "warning" | "info";
  machineSerial: string;
  partCode?: string;
  title: string;
  detail: string;
  searchQuery?: string;
}

export interface ArchiveGapReport {
  priceGaps: ArchiveGap[];
  dataGaps: ArchiveGap[];
  total: number;
  machinesWithIssues: number;
}

function gapId(parts: string[]): string {
  return parts.join(":");
}

/** Analizza archivio + anagrafica ricambi e trova lacune su dati e prezzi. */
export function computeArchiveGaps(
  archived: ArchivedDoc[],
  visibleFiles: SourceFile[]
): ArchiveGapReport {
  const priceGaps: ArchiveGap[] = [];
  const dataGaps: ArchiveGap[] = [];
  const seen = new Set<string>();

  const push = (gap: ArchiveGap) => {
    if (seen.has(gap.id)) return;
    seen.add(gap.id);
    if (gap.category === "price") priceGaps.push(gap);
    else dataGaps.push(gap);
  };

  const distinteBySerial = new Map<string, ArchivedDoc[]>();
  for (const doc of archived) {
    if (doc.tipo !== "distinta") continue;
    if (!doc.macchinaSerial) continue;
    const list = distinteBySerial.get(doc.macchinaSerial) ?? [];
    list.push(doc);
    distinteBySerial.set(doc.macchinaSerial, list);
  }

  const archivedCodes = new Set(
    archived.map((d) => d.codice).filter(Boolean) as string[]
  );
  const sourceDistinte = visibleFiles.filter(
    (f) => f.classification.tipo === "distinta"
  );

  for (const machine of MACHINES) {
    const label = machineLabel(machine.serial);
    const distinte = distinteBySerial.get(machine.serial) ?? [];

    for (const component of machine.bom) {
      if (component.bomRef) {
        const bomRef = component.bomRef;
        const bom = BOM_CATALOG[bomRef];
        if (!bom) {
          push({
            id: gapId(["bom-missing", machine.serial, bomRef]),
            category: "data",
            severity: "error",
            machineSerial: machine.serial,
            partCode: bomRef,
            title: "Distinta base assente",
            detail: `${component.description}: struttura BOM non caricata in anagrafica.`,
            searchQuery: bomRef,
          });
          continue;
        }

        const inArchive = distinte.some(
          (d) =>
            d.codice === bomRef ||
            d.file.name === bom.archiveFile ||
            d.file.name.includes(bomRef)
        );
        if (!inArchive) {
          push({
            id: gapId(["archive-missing", machine.serial, bomRef]),
            category: "data",
            severity: "warning",
            machineSerial: machine.serial,
            partCode: bomRef,
            title: "Distinta non in archivio",
            detail: `${bom.title}: file distinta non collegato all'archivio documentale.`,
            searchQuery: bomRef,
          });
        }

        for (const row of bom.rows) {
          if (row.kind !== "part") continue;
          if (isPartPriceMissing(row.code)) {
            push({
              id: gapId(["price", machine.serial, row.code]),
              category: "price",
              severity: "error",
              machineSerial: machine.serial,
              partCode: row.code,
              title: "Prezzo ricambio mancante",
              detail: `${row.description} (${row.code}) in distinta ${bomRef}.`,
              searchQuery: row.code,
            });
          }
        }
      } else if (component.listPrice <= 0) {
        push({
          id: gapId(["list-price", machine.serial, component.code]),
          category: "price",
          severity: "warning",
          machineSerial: machine.serial,
          partCode: component.code,
          title: "Prezzo listino assente",
          detail: `${component.description}: nessun prezzo in anagrafica macchina.`,
          searchQuery: component.code,
        });
      }

      if (component.keywords.length === 0) {
        push({
          id: gapId(["keywords", machine.serial, component.code]),
          category: "data",
          severity: "info",
          machineSerial: machine.serial,
          partCode: component.code,
          title: "Sinonimi ricambio mancanti",
          detail: `${component.code}: nessuna keyword per il matching automatico.`,
          searchQuery: component.code,
        });
      }
    }

    const hasAssembly = machine.bom.some((c) => c.bomRef);
    if (hasAssembly && distinte.length === 0) {
      push({
        id: gapId(["no-distinta", machine.serial]),
        category: "data",
        severity: "warning",
        machineSerial: machine.serial,
        title: "Nessuna distinta in archivio",
        detail: `${label}: assiemi a BOM senza documenti distinta collegati.`,
        searchQuery: machine.serial,
      });
    }
  }

  for (const def of Object.values(BOM_CATALOG)) {
    if (archivedCodes.has(def.rootCode)) continue;
    const inSource = sourceDistinte.some(
      (f) =>
        f.classification.codice === def.rootCode ||
        f.name === def.archiveFile ||
        bomByArchiveFile(f.name)?.id === def.id
    );
    if (!inSource) {
      push({
        id: gapId(["catalog-no-doc", def.id]),
        category: "data",
        severity: "info",
        machineSerial: "IDC-114-084",
        partCode: def.rootCode,
        title: "Distinta non archiviata",
        detail: `${def.title}: presente in anagrafica ma non tra i documenti collegati.`,
        searchQuery: def.rootCode,
      });
    }
  }

  for (const file of visibleFiles) {
    const c = file.classification;
    if (c.tipo !== "distinta") continue;
    const code = c.codice ?? file.name.replace(/\.[^.]+$/, "");
    if (!BOM_CATALOG[code] && !bomByArchiveFile(file.name)) {
      push({
        id: gapId(["unstructured-distinta", file.id]),
        category: "data",
        severity: "warning",
        machineSerial: c.macchinaSerial ?? "—",
        partCode: code,
        title: "Distinta non strutturata",
        detail: `${file.name}: righe ricambi/prezzi non importate in anagrafica.`,
        searchQuery: code,
      });
    }
    if (!c.codice) {
      push({
        id: gapId(["no-codice", file.id]),
        category: "data",
        severity: "info",
        machineSerial: c.macchinaSerial ?? "—",
        title: "Codice ricambio mancante",
        detail: `${file.name}: metadato codice non estratto dal documento.`,
        searchQuery: file.name,
      });
    }
  }

  for (const doc of archived) {
    if (doc.tipo !== "catalogo") continue;
    push({
      id: gapId(["catalog-pdf", doc.file.id]),
      category: "data",
      severity: "warning",
      machineSerial: doc.macchinaSerial ?? "—",
      title: "Catalogo non strutturato",
      detail: `${doc.file.name}: PDF catalogo senza tabella prezzi/ricambi collegata.`,
      searchQuery: doc.macchinaSerial ?? doc.cliente ?? doc.file.name,
    });
  }

  const machinesWithIssues = new Set(
    [...priceGaps, ...dataGaps].map((g) => g.machineSerial)
  ).size;

  return {
    priceGaps,
    dataGaps,
    total: priceGaps.length + dataGaps.length,
    machinesWithIssues,
  };
}
