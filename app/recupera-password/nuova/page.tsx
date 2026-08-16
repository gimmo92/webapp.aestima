import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function NuovaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-base bg-grid">
      <ResetPasswordForm token={params.token ?? ""} />
    </main>
  );
}
