import type { CompanyUserOption } from "@/lib/companyUsers";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm text-ink-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-base px-3 py-2.5 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

export function UserContactSelect({
  users,
  value,
  onChange,
  emptyLabel = "Nessun referente",
}: {
  users: CompanyUserOption[];
  value: string;
  onChange: (userId: string) => void;
  emptyLabel?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClass}
    >
      <option value="">{emptyLabel}</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name} · {u.email}
        </option>
      ))}
    </select>
  );
}
