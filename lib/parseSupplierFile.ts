import type { SupplierInput } from "./supplierTypes";

// =============================================================
// Parser import fornitori da CSV / Excel
// -------------------------------------------------------------
// Accetta file .csv (consigliato da Excel) e .xlsx (SheetJS).
// Colonne attese (intestazione, case-insensitive):
//   nome | name, email, referente | contact, categorie | categories
// =============================================================

/** Normalizza una riga oggetto con chiavi variabili. */
function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v?.trim()) return v.trim();
  }
  return "";
}

function rowToSupplier(row: Record<string, string>): SupplierInput | null {
  const name = pick(row, "nome", "name", "fornitore", "ragione sociale");
  const email = pick(row, "email", "e-mail", "mail");
  if (!name || !email) return null;

  const categoriesRaw = pick(row, "categorie", "categories", "categoria", "specializzazioni");
  const categories = categoriesRaw
    ? categoriesRaw.split(/[;,|]/).map((c) => c.trim()).filter(Boolean)
    : [];

  return {
    name,
    email,
    contact: pick(row, "referente", "contact", "contatto") || undefined,
    categories,
    notes: pick(row, "note", "notes") || undefined,
  };
}

/** Converte righe tabellari (array di oggetti) in fornitori. */
export function rowsToSuppliers(rows: Record<string, string>[]): SupplierInput[] {
  return rows.map(rowToSupplier).filter((s): s is SupplierInput => s !== null);
}

/** Parse CSV testuale (separatore , o ;). */
export function parseCsv(text: string): SupplierInput[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const delim = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ""));

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(delim).map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return rowsToSuppliers(rows);
}

/** Parse file .xlsx via dynamic import di SheetJS (solo client). */
export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<SupplierInput[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  });
  return rowsToSuppliers(json);
}

/** Parse un File (csv o xlsx) lato client. */
export async function parseSupplierFile(file: File): Promise<SupplierInput[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    return parseCsv(await file.text());
  }
  if (ext === "xlsx" || ext === "xls") {
    return parseExcelBuffer(await file.arrayBuffer());
  }
  throw new Error("Formato non supportato. Usa .csv o .xlsx");
}
