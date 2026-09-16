"use client";

import {
  CUSTOMER_SENTIMENTS,
  type CustomerSentiment,
} from "@/lib/interventionReportDraft";

export const SENTIMENT_BY_ID = Object.fromEntries(
  CUSTOMER_SENTIMENTS.map((sentiment) => [sentiment.id, sentiment])
) as Record<CustomerSentiment, (typeof CUSTOMER_SENTIMENTS)[number]>;

export function SentimentPill({
  sentiment,
  compact,
}: {
  sentiment: CustomerSentiment;
  compact?: boolean;
}) {
  const config = SENTIMENT_BY_ID[sentiment];
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-semibold",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      ].join(" ")}
      style={{ backgroundColor: `${config.color}1f`, color: config.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      {config.label}
    </span>
  );
}
