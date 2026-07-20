/** Fire-and-forget persistenza mutazioni workspace su Supabase. */
export function persistWorkspace(action: string, payload: unknown) {
  if (typeof window === "undefined") return;
  void fetch("/api/workspace/mutate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, payload }),
  }).catch((err) => {
    console.error("Persist workspace failed", action, err);
  });
}
