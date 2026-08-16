"use client";

import { useMemo, useState } from "react";
import { StatusSidebar } from "@/components/inbox/StatusSidebar";
import { RequestList } from "@/components/inbox/RequestList";
import { RequestDetail } from "@/components/inbox/RequestDetail";
import { useInbox } from "@/components/inbox/InboxProvider";
import type { PartRequest, RequestStatus } from "@/lib/inboxTypes";

/** Inbox email after-sales — stessa vista che era la home `/`. */
export function EmailInboxWorkspace() {
  const {
    requests,
    labels,
    selectedId,
    setSelectedId,
    changeStatus,
    toggleLabel,
    createLabel,
  } = useInbox();

  const [activeStatus, setActiveStatus] = useState<RequestStatus | "all">("all");
  const [activeLabelId, setActiveLabelId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"primarie" | "altre">("primarie");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (r.primary !== (tab === "primarie")) return false;
      if (activeStatus !== "all" && r.status !== activeStatus) return false;
      if (activeLabelId && !r.labelIds.includes(activeLabelId)) return false;
      if (q) {
        const haystack =
          `${r.company} ${r.from} ${r.subject} ${r.body}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [requests, tab, activeStatus, activeLabelId, query]);

  const matchesFilters = (r: PartRequest) => {
    if (activeStatus !== "all" && r.status !== activeStatus) return false;
    if (activeLabelId && !r.labelIds.includes(activeLabelId)) return false;
    const q = query.trim().toLowerCase();
    if (q) {
      const haystack =
        `${r.company} ${r.from} ${r.subject} ${r.body}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };
  const primaryCount = requests.filter((r) => r.primary && matchesFilters(r)).length;
  const otherCount = requests.filter((r) => !r.primary && matchesFilters(r)).length;

  const selected =
    filtered.find((r) => r.id === selectedId) ??
    requests.find((r) => r.id === selectedId) ??
    null;

  return (
    <div className="flex min-h-0 flex-1">
      <StatusSidebar
        requests={requests}
        labels={labels}
        activeStatus={activeStatus}
        activeLabelId={activeLabelId}
        query={query}
        onSelectStatus={setActiveStatus}
        onSelectLabel={setActiveLabelId}
        onQueryChange={setQuery}
      />
      <RequestList
        requests={filtered}
        labels={labels}
        selectedId={selected?.id ?? null}
        tab={tab}
        onSelect={setSelectedId}
        onTabChange={setTab}
        primaryCount={primaryCount}
        otherCount={otherCount}
      />
      <RequestDetail
        request={selected}
        labels={labels}
        onChangeStatus={changeStatus}
        onToggleLabel={toggleLabel}
        onCreateLabel={createLabel}
      />
    </div>
  );
}
