/** Moduli di menu per azienda. Assente o true = attivo. */

export const COMPANY_MODULES = [
  { id: "assistenza", href: "/assistenza", labelKey: "nav.assistenza" },
  { id: "installatori", href: "/installatori", labelKey: "nav.installatori" },
  { id: "ticketing", href: "/ticket", labelKey: "nav.ticketing" },
  { id: "archivio", href: "/archivio", labelKey: "nav.archivio" },
  { id: "rapporti", href: "/rapporti", labelKey: "nav.rapporti" },
  { id: "manuale", href: "/manuale", labelKey: "nav.manuale" },
  { id: "catalogo", href: "/analisi-catalogo", labelKey: "nav.catalogAnalysis" },
  { id: "offerte", href: "/crea", labelKey: "nav.createOffer" },
] as const;

export type CompanyModuleId = (typeof COMPANY_MODULES)[number]["id"];
export type CompanyModules = Record<CompanyModuleId, boolean>;

export const MODULES_EVENT = "aftercore:company-modules";

export function defaultCompanyModules(): CompanyModules {
  return {
    assistenza: true,
    installatori: true,
    ticketing: true,
    archivio: true,
    rapporti: true,
    manuale: true,
    catalogo: true,
    offerte: true,
  };
}

export function isCompanyModuleId(value: string): value is CompanyModuleId {
  return COMPANY_MODULES.some((item) => item.id === value);
}

export function modulesFromSettings(settingsJson: unknown): CompanyModules {
  const modules = defaultCompanyModules();
  if (
    !settingsJson ||
    typeof settingsJson !== "object" ||
    Array.isArray(settingsJson)
  ) {
    return modules;
  }
  const raw = (settingsJson as { modules?: unknown }).modules;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return modules;
  const row = raw as Record<string, unknown>;
  for (const item of COMPANY_MODULES) {
    if (row[item.id] === false) modules[item.id] = false;
  }
  return modules;
}

export function isModuleEnabled(modules: CompanyModules, href: string): boolean {
  const match = COMPANY_MODULES.find(
    (item) => href === item.href || href.startsWith(`${item.href}/`)
  );
  if (!match) return true;
  return modules[match.id] !== false;
}
