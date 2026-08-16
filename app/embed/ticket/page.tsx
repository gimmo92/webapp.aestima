import { prisma } from "@/lib/prisma";
import { TicketEmbedForm } from "@/components/tickets/TicketEmbedForm";
import { normalizeTicketForm } from "@/lib/ticketForm";

export default async function EmbedTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const slug = (await searchParams).company?.trim() ?? "";
  const company = slug
    ? await prisma.company.findUnique({
        where: { slug },
        select: { name: true, slug: true, settingsJson: true },
      })
    : null;

  if (!company) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-base px-5 text-center">
        <p className="text-sm text-ink-muted">
          Form ticket non disponibile: company non valida.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-base">
      <TicketEmbedForm
        companySlug={company.slug}
        companyName={company.name}
        config={normalizeTicketForm(
          (company.settingsJson as { ticketForm?: unknown } | null)?.ticketForm
        )}
      />
    </div>
  );
}
