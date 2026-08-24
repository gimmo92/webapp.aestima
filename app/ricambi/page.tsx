"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { InboxTopBar } from "@/components/inbox/InboxTopBar";
import { SparePartDetailSheet } from "@/components/service-chat/SparePartDetailSheet";
import { useI18n } from "@/lib/i18n";

function SparePartSheetPageInner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const code = (params.get("codice") ?? "").trim();

  return (
    <div className="flex min-h-screen flex-col bg-base">
      <InboxTopBar />
      <main className="min-h-0 flex-1 overflow-y-auto bg-grid">
        {code ? (
          <SparePartDetailSheet
            part={{
              code,
              description: code,
              price: 0,
              availability: "da_ordinare",
            }}
          />
        ) : (
          <p className="px-5 py-16 text-center text-sm text-ink-muted">
            {t("spare.missingCode")}
          </p>
        )}
      </main>
    </div>
  );
}

export default function SparePartSheetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base" />}>
      <SparePartSheetPageInner />
    </Suspense>
  );
}
