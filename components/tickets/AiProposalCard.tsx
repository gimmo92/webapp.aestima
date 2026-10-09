"use client";

import { useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import { labelForDepartment } from "@/lib/companyDepartments";
import {
  isBelowThreshold,
  TELEPHONY_CATEGORIES,
  TELEPHONY_CATEGORY_LABELS,
} from "@/lib/telephony/classify";
import type { CallProposal, TelephonyCategory } from "@/lib/telephony/classify";

type Choice = Omit<CallProposal, "confidence">;

export function AiProposalCard({
  proposal,
  initial,
  confirmed,
  automatic = false,
  threshold,
  onConfirm,
}: {
  proposal: CallProposal;
  initial: Choice;
  confirmed: boolean;
  automatic?: boolean;
  threshold: number;
  onConfirm: (choice: Choice) => void;
}) {
  const { ticketFieldLabels, departments } = useInbox();
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<Choice>(initial);

  const low = isBelowThreshold(proposal.confidence, threshold);
  const shown = editing ? choice : confirmed ? choice : proposal;

  return (
    <section className="rounded-xl border border-brand/40 bg-brand-soft/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand">
          Proposta AI
        </p>
        <p className="text-xs text-ink-muted">
          Confidenza {Math.round(proposal.confidence * 100)}%
          {low ? " · sotto soglia, non passa ad Assegnato" : ""}
          {confirmed
            ? automatic
              ? " · instradata in automatico"
              : " · confermata"
            : ""}
        </p>
      </div>
      {editing ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Select
            label="Categoria"
            value={choice.category}
            onChange={(value) =>
              setChoice((prev) => ({
                ...prev,
                category: value as TelephonyCategory,
              }))
            }
            options={TELEPHONY_CATEGORIES.map((id) => ({
              id,
              label: TELEPHONY_CATEGORY_LABELS[id],
            }))}
          />
          <Select
            label="Reparto"
            value={choice.department ?? ""}
            onChange={(value) =>
              setChoice((prev) => ({
                ...prev,
                department: value || null,
              }))
            }
            options={[
              { id: "", label: "Nessuno" },
              ...departments.map((item) => ({ id: item.id, label: item.label })),
            ]}
          />
          <Select
            label="Urgenza"
            value={choice.urgency}
            onChange={(value) =>
              setChoice((prev) => ({
                ...prev,
                urgency: value === "alta" ? "alta" : "normale",
              }))
            }
            options={[
              { id: "normale", label: "Normale" },
              { id: "alta", label: "Alta" },
            ]}
          />
          <Field
            label={ticketFieldLabels.machineModel}
            value={choice.product ?? ""}
            onChange={(product) => setChoice((prev) => ({ ...prev, product: product || null }))}
          />
          <Field
            label={ticketFieldLabels.machineSerial}
            value={choice.orderNumber ?? ""}
            onChange={(orderNumber) =>
              setChoice((prev) => ({ ...prev, orderNumber: orderNumber || null }))
            }
          />
          <Field
            label="Codici pezzo"
            value={choice.partCodes.join(", ")}
            onChange={(raw) =>
              setChoice((prev) => ({
                ...prev,
                partCodes: raw
                  .split(",")
                  .map((code) => code.trim())
                  .filter(Boolean),
              }))
            }
          />
          <div className="sm:col-span-2">
            <Field
              label="Riepilogo"
              value={choice.summary}
              onChange={(summary) => setChoice((prev) => ({ ...prev, summary }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Azione suggerita"
              value={choice.suggestedAction}
              onChange={(suggestedAction) =>
                setChoice((prev) => ({ ...prev, suggestedAction }))
              }
            />
          </div>
        </div>
      ) : (
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <Item label="Categoria" value={TELEPHONY_CATEGORY_LABELS[shown.category]} />
          <Item
            label="Reparto"
            value={labelForDepartment(departments, shown.department) ?? "Nessuno"}
          />
          <Item label="Urgenza" value={shown.urgency === "alta" ? "Alta" : "Normale"} />
          <Item label={ticketFieldLabels.machineModel} value={shown.product ?? "—"} />
          <Item label={ticketFieldLabels.machineSerial} value={shown.orderNumber ?? "—"} />
          <Item
            label="Codici pezzo"
            value={shown.partCodes.length ? shown.partCodes.join(", ") : "—"}
          />
          <Item label="Riepilogo" value={shown.summary} wide />
          <Item label="Azione suggerita" value={shown.suggestedAction} wide />
        </dl>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {!confirmed && !editing && (
          <button
            type="button"
            onClick={() => onConfirm(proposal)}
            className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-strong"
          >
            Conferma
          </button>
        )}
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => {
                onConfirm(choice);
                setEditing(false);
              }}
              className="rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-strong"
            >
              Salva scelta
            </button>
            <button
              type="button"
              onClick={() => {
                setChoice(proposal);
                setEditing(false);
              }}
              className="rounded-lg border border-border bg-base px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink"
            >
              Annulla
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border bg-base px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink"
          >
            Modifica
          </button>
        )}
      </div>
    </section>
  );
}

function Item({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs text-ink-muted">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="block text-xs text-ink-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-base px-2 py-1.5 text-sm text-ink outline-none focus:border-brand"
      >
        {options.map((option) => (
          <option key={option.id || "none"} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
