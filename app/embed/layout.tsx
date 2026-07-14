import type { Metadata } from "next";

// Layout embed: consentito in iframe su siti esterni (demo / widget cliente).
export const metadata: Metadata = {
  title: "Embed assistenza — aestima",
  robots: { index: false, follow: false },
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-0 bg-base text-ink">{children}</div>
  );
}
