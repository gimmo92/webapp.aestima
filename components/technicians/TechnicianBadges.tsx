"use client";

import { CAPABILITY_BY_ID, REPORT_OUTCOME_BY_ID, REPORT_TYPE_BY_ID } from "@/lib/technicianData";
import type {
  InterventionReportOutcome,
  InterventionReportType,
  TechnicianAssignmentStatus,
} from "@/lib/technicianTypes";
import { TECHNICIAN_STATUS_BY_ID } from "@/lib/technicianData";

export function TechnicianAssignmentStatusPill({
  status,
  compact,
}: {
  status: TechnicianAssignmentStatus;
  compact?: boolean;
}) {
  const cfg = TECHNICIAN_STATUS_BY_ID[status];
  const color = cfg?.color ?? "#9fb0c3";
  const label = cfg?.label ?? status;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-semibold",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
      ].join(" ")}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function InterventionReportTypePill({
  type,
  compact,
}: {
  type: InterventionReportType;
  compact?: boolean;
}) {
  const cfg = REPORT_TYPE_BY_ID[type];
  const color = cfg?.color ?? "#9fb0c3";
  const label = cfg?.label ?? type;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-semibold",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
      ].join(" ")}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function InterventionReportOutcomePill({
  outcome,
  compact,
}: {
  outcome: InterventionReportOutcome;
  compact?: boolean;
}) {
  const cfg = REPORT_OUTCOME_BY_ID[outcome];
  const color = cfg?.color ?? "#9fb0c3";
  const label = cfg?.label ?? outcome;

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-semibold",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-[11px]",
      ].join(" ")}
      style={{ color, backgroundColor: `${color}1a` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

export function CapabilityTags({
  ids,
  max = 3,
}: {
  ids: string[];
  max?: number;
}) {
  const shown = ids.slice(0, max);
  const rest = ids.length - shown.length;

  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((id) => {
        const cap = CAPABILITY_BY_ID[id];
        return (
          <span
            key={id}
            className="rounded-full border border-border bg-base px-1.5 py-0.5 text-[10px] font-medium text-ink-muted"
            style={cap ? { borderColor: `${cap.color}40`, color: cap.color } : undefined}
          >
            {cap?.label ?? id}
          </span>
        );
      })}
      {rest > 0 && (
        <span className="rounded-full px-1.5 py-0.5 text-[10px] text-ink-faint">
          +{rest}
        </span>
      )}
    </span>
  );
}
