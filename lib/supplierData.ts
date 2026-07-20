import type {
  Supplier,
  SupplierRequest,
  SupplierRequestStatusConfig,
} from "./supplierTypes";

export const SUPPLIER_REQUEST_STATUSES: SupplierRequestStatusConfig[] = [
  { id: "bozza", label: "Bozza", color: "#9fb0c3" },
  { id: "inviata", label: "Inviata", color: "#3b82f6" },
  { id: "in_attesa", label: "In attesa risposta", color: "#f59e0b" },
  { id: "risposta_ricevuta", label: "Risposta ricevuta", color: "#06b6d4" },
  { id: "confermata", label: "Confermata", color: "#22c55e" },
  { id: "annullata", label: "Annullata", color: "#ef4444" },
];

export const SUPPLIER_STATUS_BY_ID = Object.fromEntries(
  SUPPLIER_REQUEST_STATUSES.map((s) => [s.id, s])
);

export const MOCK_SUPPLIERS: Supplier[] = [];
export const MOCK_SUPPLIER_REQUESTS: SupplierRequest[] = [];

export function newSupplierId(): string {
  return `sup-${Date.now()}`;
}

export function newSupplierRequestId(): string {
  return `sr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
