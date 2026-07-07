import { INTERVENTION_CAPABILITIES } from "./technicianData";
import type { TechnicianInput } from "./technicianTypes";

// =============================================================
// Parser import tecnici da CSV / Excel
// Colonne: nome, email, telefono, capacita, regione, note
// =============================================================

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k] ?? row[k.toLowerCase()] ?? row[k.toUpperCase()];
    if (v?.trim()) return v.trim();
  }
  return "";
}

function mapCapabilities(raw: string): string[] {
  if (!raw.trim()) return [];
  const parts = raw.split(/[;,|]/).map((c) => c.trim()).filter(Boolean);
  const ids = new Set<string>();

  for (const part of parts) {
    const lower = part.toLowerCase();
    const byId = INTERVENTION_CAPABILITIES.find((c) => c.id === lower);
    if (byId) {
      ids.add(byId.id);
      continue;
    }
    const byLabel = INTERVENTION_CAPABILITIES.find(
      (c) =>
        c.label.toLowerCase() === lower ||
        c.label.toLowerCase().includes(lower) ||
        lower.includes(c.label.toLowerCase())
    );
    if (byLabel) ids.add(byLabel.id);
  }

  return [...ids];
}

function rowToTechnician(row: Record<string, string>): TechnicianInput | null {
  const name = pick(row, "nome", "name", "tecnico");
  const email = pick(row, "email", "e-mail", "mail");
  const phone = pick(row, "telefono", "phone", "cellulare", "whatsapp", "mobile");
  if (!name || !email || !phone) return null;

  const capabilitiesRaw = pick(
    row,
    "capacita",
    "capacità",
    "capabilities",
    "competenze",
    "specializzazioni"
  );

  return {
    name,
    email,
    phone: phone.replace(/\D/g, "").replace(/^0/, "39"),
    capabilities: mapCapabilities(capabilitiesRaw),
    region: pick(row, "regione", "region", "zona", "area") || undefined,
    notes: pick(row, "note", "notes") || undefined,
  };
}

export function rowsToTechnicians(rows: Record<string, string>[]): TechnicianInput[] {
  return rows.map(rowToTechnician).filter((t): t is TechnicianInput => t !== null);
}

export function parseCsv(text: string): TechnicianInput[] {
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
  return rowsToTechnicians(rows);
}

export async function parseExcelBuffer(buffer: ArrayBuffer): Promise<TechnicianInput[]> {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    defval: "",
  });
  return rowsToTechnicians(json);
}

export async function parseTechnicianFile(file: File): Promise<TechnicianInput[]> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv" || ext === "txt") {
    return parseCsv(await file.text());
  }
  if (ext === "xlsx" || ext === "xls") {
    return parseExcelBuffer(await file.arrayBuffer());
  }
  throw new Error("Formato non supportato. Usa .csv o .xlsx");
}
