export type StatsPeriod = "7" | "30" | "90" | "all";

export function periodStart(period: StatsPeriod, now = new Date()): Date | null {
  if (period === "all") return null;
  const days = Number(period);
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function isOnOrAfter(
  iso: string | null | undefined,
  start: Date | null
): boolean {
  if (!start) return true;
  if (!iso) return false;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return false;
  return time >= start.getTime();
}

export function countGroups(keys: string[]): { key: string; count: number }[] {
  const map = new Map<string, number>();
  for (const key of keys) map.set(key, (map.get(key) ?? 0) + 1);
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, "it"));
}

export function averageResolutionHours(
  tickets: { createdAt?: string | null; resolvedAt?: string | null }[],
  start: Date | null
): { averageHours: number | null; count: number } {
  const hours: number[] = [];
  for (const ticket of tickets) {
    if (!isOnOrAfter(ticket.resolvedAt, start)) continue;
    if (!ticket.createdAt || !ticket.resolvedAt) continue;
    const created = Date.parse(ticket.createdAt);
    const resolved = Date.parse(ticket.resolvedAt);
    if (Number.isNaN(created) || Number.isNaN(resolved) || resolved < created) {
      continue;
    }
    hours.push((resolved - created) / 3_600_000);
  }
  if (hours.length === 0) return { averageHours: null, count: 0 };
  const total = hours.reduce((sum, value) => sum + value, 0);
  return { averageHours: total / hours.length, count: hours.length };
}

export function formatResolutionHours(hours: number | null): string {
  if (hours == null) return "—";
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60));
    return `${minutes} min`;
  }
  if (hours < 48) return `${hours.toFixed(1).replace(".", ",")} ore`;
  return `${(hours / 24).toFixed(1).replace(".", ",")} giorni`;
}
