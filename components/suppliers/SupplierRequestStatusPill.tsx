import { SUPPLIER_STATUS_BY_ID } from "@/lib/supplierData";
import type { SupplierRequestStatus } from "@/lib/supplierTypes";

export function SupplierRequestStatusPill({
  status,
  compact,
}: {
  status: SupplierRequestStatus;
  compact?: boolean;
}) {
  const cfg = SUPPLIER_STATUS_BY_ID[status];
  if (compact) {
    return (
      <span
        className="inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: cfg.color }}
        title={cfg.label}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: cfg.color, backgroundColor: `${cfg.color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}
