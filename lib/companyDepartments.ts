import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  type DepartmentId,
} from "@/lib/telephony/classify";

export type CompanyDepartment = {
  id: string;
  label: string;
};

export const DEFAULT_DEPARTMENTS: CompanyDepartment[] = DEPARTMENTS.map(
  (id) => ({ id, label: DEPARTMENT_LABELS[id as DepartmentId] })
);

const ID_PATTERN = /^[a-z][a-z0-9_]{0,39}$/;

export function isDepartmentSlug(value: unknown): value is string {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function newDepartmentId(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 32);
  return slug && ID_PATTERN.test(slug) ? slug : `reparto_${Date.now().toString(36)}`;
}

export function sanitizeDepartments(value: unknown): CompanyDepartment[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: CompanyDepartment[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const label = typeof row.label === "string" ? row.label.trim().slice(0, 40) : "";
    if (!isDepartmentSlug(id) || !label || seen.has(id)) continue;
    seen.add(id);
    result.push({ id, label });
  }
  return result;
}

/** Se l'azienda non ha ancora salvato i reparti, restano i tre predefiniti. */
export function departmentsFromSettings(settingsJson: unknown): CompanyDepartment[] {
  if (
    !settingsJson ||
    typeof settingsJson !== "object" ||
    Array.isArray(settingsJson) ||
    !("departments" in settingsJson)
  ) {
    return DEFAULT_DEPARTMENTS.map((item) => ({ ...item }));
  }
  return sanitizeDepartments(
    (settingsJson as { departments?: unknown }).departments
  );
}

export function labelForDepartment(
  departments: CompanyDepartment[],
  id: string | null | undefined
): string | null {
  if (!id) return null;
  return departments.find((item) => item.id === id)?.label ?? id;
}
