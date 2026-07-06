import { DOC_TYPES } from "@/lib/archiveData";
import type { DocType } from "@/lib/archiveTypes";

// Badge del tipo di documento riconosciuto (colore inline per tipo).

export function DocTypeBadge({ tipo }: { tipo: DocType }) {
  const cfg = DOC_TYPES[tipo];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: cfg.color, backgroundColor: `${cfg.color}1f` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}
