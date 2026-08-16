"use client";

import { useMemo, useState } from "react";
import { RequestList } from "@/components/inbox/RequestList";
import { RequestDetail } from "@/components/inbox/RequestDetail";
import { useInbox } from "@/components/inbox/InboxProvider";

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

  const [tab, setTab] = useState<"primarie" | "altre">("primarie");

  const filtered = useMemo(
    () => requests.filter((r) => r.primary === (tab === "primarie")),
    [requests, tab]
  );

  const primaryCount = requests.filter((r) => r.primary).length;
  const otherCount = requests.filter((r) => !r.primary).length;

  const selected =
    filtered.find((r) => r.id === selectedId) ??
    requests.find((r) => r.id === selectedId) ??
    null;

  return (
    <div className="flex min-h-0 flex-1">
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
