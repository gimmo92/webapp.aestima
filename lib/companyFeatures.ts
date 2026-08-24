/** Company per cui il ticketing è nascosto in UI (temporaneo). */
const TICKETING_HIDDEN_SLUGS = new Set(["dematic"]);

export type CompanyNavRef = {
  slug?: string | null;
  name?: string | null;
};

const COMPANY_CACHE_KEY = "aftercore:company-nav:v1";

export function isTicketingHiddenForCompany(
  company?: CompanyNavRef | null
): boolean {
  const slug = (company?.slug ?? "").trim().toLowerCase();
  if (slug && TICKETING_HIDDEN_SLUGS.has(slug)) return true;
  const name = (company?.name ?? "").trim().toLowerCase();
  return name.includes("dematic");
}

export function readCachedCompany(): CompanyNavRef | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COMPANY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const row = parsed as Record<string, unknown>;
    const slug = typeof row.slug === "string" ? row.slug : "";
    const name = typeof row.name === "string" ? row.name : "";
    if (!slug && !name) return null;
    return { slug, name };
  } catch {
    return null;
  }
}

export function writeCachedCompany(company: CompanyNavRef) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      COMPANY_CACHE_KEY,
      JSON.stringify({
        slug: company.slug ?? "",
        name: company.name ?? "",
      })
    );
  } catch {
    /* ignore */
  }
}

export function clearCachedCompany() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(COMPANY_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
