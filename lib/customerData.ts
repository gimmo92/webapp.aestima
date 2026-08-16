import type { Customer } from "./customerTypes";

export function newCustomerId(): string {
  return `cus-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
}

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "cus-001",
    name: "Cartonificio Alpino S.p.A.",
    contactName: "Elena Bianchi",
    email: "manutenzione@cartonificioalpino.it",
    phone: "+39 011 4567890",
    vat: "IT01234567890",
    city: "Torino",
    address: "Via Industria 14",
    notes: "Cliente storico, preferisce comunicazioni via email.",
  },
  {
    id: "cus-002",
    name: "Packaging Veneto S.r.l.",
    contactName: "Luca Moretti",
    email: "tecnico@packagingveneto.it",
    phone: "+39 049 998877",
    vat: "IT09876543210",
    city: "Padova",
    address: "Via dell'Artigianato 8",
  },
  {
    id: "cus-003",
    name: "Logistica Adriatica",
    contactName: "Sara Greco",
    email: "sara.greco@logadriatica.it",
    phone: "+39 071 334455",
    city: "Ancona",
    notes: "Contratto di assistenza 2026.",
  },
];
