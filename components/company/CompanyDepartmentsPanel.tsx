"use client";

import { useState } from "react";
import { useInbox } from "@/components/inbox/InboxProvider";
import {
  newDepartmentId,
  type CompanyDepartment,
} from "@/lib/companyDepartments";
import { useI18n } from "@/lib/i18n";
import { inputClass } from "./formFields";

export function CompanyDepartmentsPanel({ canManage }: { canManage: boolean }) {
  const { departments, setDepartments, tickets, companyUsers } = useInbox();
  const { t } = useI18n();
  const [draft, setDraft] = useState("");

  const rename = (id: string, label: string) => {
    setDepartments(
      departments.map((item) => (item.id === id ? { ...item, label } : item))
    );
  };

  const remove = (item: CompanyDepartment) => {
    const used =
      tickets.some((ticket) => ticket.department === item.id) ||
      companyUsers.some((user) => user.department === item.id);
    if (used) {
      window.alert(t("company.departmentInUse"));
      return;
    }
    setDepartments(departments.filter((row) => row.id !== item.id));
  };

  const add = () => {
    const label = draft.trim();
    if (!label) return;
    let id = newDepartmentId(label);
    if (departments.some((item) => item.id === id)) {
      id = `${id}_${Date.now().toString(36)}`.slice(0, 40);
    }
    setDepartments([...departments, { id, label: label.slice(0, 40) }]);
    setDraft("");
  };

  return (
    <section className="rounded-2xl border border-border bg-surface/60 p-5">
      <h2 className="text-sm font-semibold text-ink">{t("company.departments")}</h2>
      <p className="mt-1 text-xs text-ink-faint">{t("company.departmentsHint")}</p>

      <ul className="mt-4 space-y-2">
        {departments.length === 0 && (
          <li className="text-sm text-ink-faint">{t("company.noDepartments")}</li>
        )}
        {departments.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-base/60 px-3 py-2"
          >
            <input
              value={item.label}
              disabled={!canManage}
              onChange={(event) => {
                const label = event.target.value.slice(0, 40);
                if (!label.trim()) return;
                rename(item.id, label);
              }}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
            />
            {canManage && (
              <button
                type="button"
                onClick={() => remove(item)}
                className="text-xs font-medium text-danger hover:underline"
              >
                {t("common.delete")}
              </button>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
            placeholder={t("company.newDepartment")}
            className={`${inputClass} max-w-xs`}
          />
          <button
            type="button"
            onClick={add}
            className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-strong"
          >
            {t("company.addDepartment")}
          </button>
        </div>
      )}
    </section>
  );
}
