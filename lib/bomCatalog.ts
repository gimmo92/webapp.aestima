import type { QuoteLine } from "./types";

export const LABOR_HOURLY_RATE = 85;

export interface BomRow {
  code: string;
  description: string;
  qty: number;
  unit: "NR" | "MT" | "H";
  kind: "part" | "labor";
}

export interface BomDefinition {
  id: string;
  rootCode: string;
  title: string;
  archiveFile: string;
  rows: BomRow[];
}

/** Prezzo unitario ricambio (undefined = non a listino). */
export function getPartUnitPrice(code: string): number | undefined {
  return UNIT_PRICES[code];
}

/** True se il codice ricambio non ha prezzo valido in anagrafica. */
export function isPartPriceMissing(code: string): boolean {
  const price = UNIT_PRICES[code];
  return price === undefined || price <= 0;
}

/** Prezzi unitari ricambio (sovrascrivibili a runtime da lacune archivio). */
const UNIT_PRICES: Record<string, number> = {};

export const BOM_CATALOG: Record<string, BomDefinition> = {};

/** Imposta/aggiorna il prezzo listino di un codice ricambio (sessione corrente). */
export function setPartUnitPrice(code: string, price: number): void {
  const trimmed = code.trim();
  if (!trimmed || !(price > 0)) return;
  UNIT_PRICES[trimmed] = price;
}

/** Righe preventivo da distinta base (ricambi + ore uomo). */
export function quoteLinesFromBom(
  bomRef: string,
  machineLabel: string
): QuoteLine[] {
  const bom = BOM_CATALOG[bomRef];
  if (!bom) return [];

  return bom.rows.map((row) => {
    const unitPrice =
      row.kind === "labor" ? LABOR_HOURLY_RATE : (UNIT_PRICES[row.code] ?? 0);
    const qty = row.qty;
    return {
      code: row.code,
      description: `${row.description} — ${machineLabel}${row.kind === "labor" ? " (manodopera)" : ""}`,
      qty,
      unitPrice,
      total: Math.round(qty * unitPrice * 100) / 100,
    };
  });
}

export function bomByArchiveFile(name: string): BomDefinition | undefined {
  return Object.values(BOM_CATALOG).find((b) => b.archiveFile === name);
}
