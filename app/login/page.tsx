import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="min-h-screen bg-base bg-grid">
      <LoginForm nextPath={params.next} resetDone={params.reset === "1"} />
    </main>
  );
}
