export type CompanyProfile = {
  vat?: string;
  pec?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  website?: string;
};

export function parseCompanyProfile(settingsJson: unknown): CompanyProfile {
  if (!settingsJson || typeof settingsJson !== "object") return {};
  const raw = (settingsJson as { companyProfile?: unknown }).companyProfile;
  if (!raw || typeof raw !== "object") return {};
  const p = raw as Record<string, unknown>;
  const pick = (key: string) =>
    typeof p[key] === "string" && p[key].trim() ? p[key].trim() : undefined;
  return {
    vat: pick("vat"),
    pec: pick("pec"),
    phone: pick("phone"),
    email: pick("email"),
    address: pick("address"),
    city: pick("city"),
    website: pick("website"),
  };
}
