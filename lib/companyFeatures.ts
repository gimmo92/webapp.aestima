/** Company per cui il ticketing è nascosto in UI (temporaneo). */
const TICKETING_HIDDEN_SLUGS = new Set(["dematic"]);

export function isTicketingHiddenForCompany(company?: {
  slug?: string | null;
  name?: string | null;
} | null): boolean {
  const slug = (company?.slug ?? "").trim().toLowerCase();
  if (slug && TICKETING_HIDDEN_SLUGS.has(slug)) return true;
  const name = (company?.name ?? "").trim().toLowerCase();
  return name.includes("dematic");
}
