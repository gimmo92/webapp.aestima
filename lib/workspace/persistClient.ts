/** Persistenza mutazioni workspace su Supabase, in coda (niente fire-and-forget parallelo). */

let persistChain: Promise<void> = Promise.resolve();

async function persistOnce(action: string, payload: unknown) {
  const res = await fetch("/api/workspace/mutate", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || `Salvataggio fallito (${res.status})`);
  }
}

export function persistWorkspace(action: string, payload: unknown) {
  if (typeof window === "undefined") return;
  persistChain = persistChain
    .then(() => persistOnce(action, payload))
    .catch((err) => {
      console.error("Persist workspace failed", action, err);
    });
}
