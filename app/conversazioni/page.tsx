import { redirect } from "next/navigation";

export default async function ConversazioniPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const params = await searchParams;
  const qs = params.id ? `?id=${encodeURIComponent(params.id)}` : "";
  redirect(`/ticket/chat${qs}`);
}
