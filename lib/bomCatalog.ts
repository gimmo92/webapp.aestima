import type { QuoteLine } from "./types";

// =============================================================
// DISTINTE BASE — da file Excel in /esempi archivio
// -------------------------------------------------------------
// Contiene le strutture BOM reali (curva rinvio, ruota traino,
// assieme fune) con prezzi demo e ore manodopera per il montaggio.
// =============================================================

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

/** Prezzi unitari demo per codici ricambio (EUR). */
const UNIT_PRICES: Record<string, number> = {
  "1291200010_GR": 185,
  "1291200130": 245,
  "1291400010_GR": 420,
  "1002033": 38,
  UNI1751D08ZN: 0.45,
  UNI5588M08ZN: 0.35,
  UNI5739M08035ZN: 0.55,
  UNI5739M08050ZN: 0.65,
  UNI6592D08ZN: 0.12,
  UNI7435D025: 1.2,
  "1381400061C": 2.5,
  "1381400061D": 890,
  "1841400120B": 4.2,
  "1023021": 3.8,
  "1011600051": 12,
  "1011600070": 18,
  "1011600080": 22,
  "1051600230": 45,
  UNI7437D019FE: 0.8,
  "1051600190": 1.5,
};

export const BOM_CATALOG: Record<string, BomDefinition> = {
  "3381200010": {
    id: "3381200010",
    rootCode: "3381200010",
    title: "CURVA RINVIO 90° 114TCZ MODELLO IC-114G (TACCHE)",
    archiveFile: "3381200010.xlsx",
    rows: [
      { code: "1291200010_GR", description: "GREZZO GUSCIO CURVA 90° 114 TF/TC", qty: 2, unit: "NR", kind: "part" },
      { code: "1291200130", description: "PERNO CURVA 114 IC TF/TC IN FE -ZINC. A FREDDO", qty: 1, unit: "NR", kind: "part" },
      { code: "1291400010_GR", description: "GREZZO INTERNO 114 TF-TC, Ghisa grigia, tipo 20", qty: 1, unit: "NR", kind: "part" },
      { code: "1002033", description: "CUSCINETTO A SFERE 6005 2RS", qty: 2, unit: "NR", kind: "part" },
      { code: "UNI1751D08ZN", description: "RONDELLA GROWER D.8 FORMA A", qty: 19, unit: "NR", kind: "part" },
      { code: "UNI5588M08ZN", description: "DADO M8 MEDIO ZINCATO", qty: 19, unit: "NR", kind: "part" },
      { code: "UNI5739M08035ZN", description: "VITE TE M8x35 ZN", qty: 7, unit: "NR", kind: "part" },
      { code: "UNI5739M08050ZN", description: "VITE TE M8x50 ZINCATO", qty: 12, unit: "NR", kind: "part" },
      { code: "UNI6592D08ZN", description: "RONDELLA PIANA D.8,4 ZINCATA", qty: 19, unit: "NR", kind: "part" },
      { code: "UNI7435D025", description: "ANELLO SEEGER PER ALBERO Ø25 Fe", qty: 1, unit: "NR", kind: "part" },
      { code: "MO-3381200010", description: "Montaggio curva rinvio (distinta 3381200010)", qty: 0.25, unit: "H", kind: "labor" },
    ],
  },
  "1381400061_F": {
    id: "1381400061_F",
    rootCode: "1381400061_F",
    title: "RUOTA TRAINO 76 TC/114 TCZ 12 PASSI C40 TEMPRATA",
    archiveFile: "1381400061_F.xlsx",
    rows: [
      { code: "1381400061C", description: "CONTENIMENTO PER RUOTA TRAINO, C45", qty: 24, unit: "NR", kind: "part" },
      { code: "1381400061D", description: "CORONA RUOTA TRAINO 76TC/114TCZ, C45", qty: 1, unit: "NR", kind: "part" },
      { code: "1841400120B", description: "APPOGGIO, C45", qty: 24, unit: "NR", kind: "part" },
      { code: "MO-1381400061", description: "Carpenteria e assemblaggio ruota traino", qty: 2, unit: "H", kind: "labor" },
    ],
  },
  "3051600250_134": {
    id: "3051600250_134",
    rootCode: "3051600250_134",
    title: "IDC ASSIEME FUNE 114 I RTP — cavo D.6, dischi D.90",
    archiveFile: "3051600250_134.xlsx",
    rows: [
      { code: "1023021", description: "Cavo ferro zincato mm 6 SEALE IWRC SGRASSATO S2-d6", qty: 30.284, unit: "MT", kind: "part" },
      { code: "1011600051", description: "BUSSOLA A PRESSARE GIUNTO CAVO HS, AISI303", qty: 2, unit: "NR", kind: "part" },
      { code: "1011600070", description: "BOCCOLA DI BLOCCAGGIO IN PR 80 Zn", qty: 1, unit: "NR", kind: "part" },
      { code: "1011600080", description: "ANELLO DI BLOCCAGGIO IN PN 80 Zn", qty: 1, unit: "NR", kind: "part" },
      { code: "1051600230", description: "SEMIDISCO GIUNZIONE IDC 114 OLEFINICA", qty: 2, unit: "NR", kind: "part" },
      { code: "UNI7437D019FE", description: "ANELLO SEEGER DI BLOCCAGGIO PER FORO UNI 7437 Ø19 IN FE", qty: 1, unit: "NR", kind: "part" },
      { code: "1051600190", description: "FASCETTA LEGRAND NYLON 3.5×380 mm", qty: 2, unit: "NR", kind: "part" },
      { code: "MO-3051600250", description: "Montaggio assieme fune (tensionamento + giunti)", qty: 0.5, unit: "H", kind: "labor" },
    ],
  },
};

/** Righe preventivo da distinta base (ricambi + ore uomo). */
export function quoteLinesFromBom(
  bomRef: string,
  machineLabel: string
): QuoteLine[] {
  const bom = BOM_CATALOG[bomRef];
  if (!bom) return [];

  return bom.rows.map((row) => {
    const unitPrice =
      row.kind === "labor"
        ? LABOR_HOURLY_RATE
        : (UNIT_PRICES[row.code] ?? 0);
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
