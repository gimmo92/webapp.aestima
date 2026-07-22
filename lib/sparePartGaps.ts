import type { ArchiveGap, ArchiveGapReport } from "./archiveGaps";
import type { SparePart } from "./sparePartTypes";

/** Lacune completezza sull'anagrafica ricambi. */
export function computeSparePartGaps(parts: SparePart[]): ArchiveGapReport {
  const priceGaps: ArchiveGap[] = [];
  const dataGaps: ArchiveGap[] = [];
  const seen = new Set<string>();

  const push = (gap: ArchiveGap) => {
    if (seen.has(gap.id)) return;
    seen.add(gap.id);
    if (gap.category === "price") priceGaps.push(gap);
    else dataGaps.push(gap);
  };

  const byCode = new Map<string, SparePart[]>();
  for (const p of parts) {
    const k = p.codice.toUpperCase();
    const arr = byCode.get(k) ?? [];
    arr.push(p);
    byCode.set(k, arr);
  }

  for (const p of parts) {
    if (p.prezzoListino == null || p.prezzoListino <= 0) {
      push({
        id: `sp-price:${p.id}`,
        category: "price",
        severity: "error",
        machineSerial: p.macchinaCompatibile ?? "—",
        partCode: p.codice,
        title: "Ricambio senza prezzo",
        detail: `${p.descrizione || p.codice}: prezzo listino mancante.`,
        searchQuery: p.codice,
        action: "set_price",
      });
    }
    if (!p.fornitore?.trim()) {
      push({
        id: `sp-forn:${p.id}`,
        category: "data",
        severity: "warning",
        machineSerial: p.macchinaCompatibile ?? "—",
        partCode: p.codice,
        title: "Ricambio senza fornitore",
        detail: `${p.codice}: fornitore non valorizzato.`,
        searchQuery: p.codice,
        action: "search",
      });
    }
    if (!p.macchinaCompatibile?.trim()) {
      push({
        id: `sp-mac:${p.id}`,
        category: "data",
        severity: "info",
        machineSerial: "—",
        partCode: p.codice,
        title: "Ricambio senza macchina",
        detail: `${p.codice}: macchina compatibile non indicata.`,
        searchQuery: p.codice,
        action: "search",
      });
    }
    if (p.daVerificare) {
      push({
        id: `sp-verify:${p.id}`,
        category: "data",
        severity: "warning",
        machineSerial: p.macchinaCompatibile ?? "—",
        partCode: p.codice,
        title: "Da verificare",
        detail: `${p.codice}: conflitti tra sorgenti${
          p.conflictFields?.length
            ? ` (${p.conflictFields.join(", ")})`
            : ""
        }.`,
        searchQuery: p.codice,
        action: "search",
      });
    }
  }

  for (const [code, list] of byCode) {
    if (list.length < 2) continue;
    push({
      id: `sp-dup:${code}`,
      category: "data",
      severity: "warning",
      machineSerial: list[0]?.macchinaCompatibile ?? "—",
      partCode: code,
      title: "Duplicato sospetto",
      detail: `${list.length} record con codice ${code}.`,
      searchQuery: code,
      action: "search",
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
