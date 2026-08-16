export type CompanyUserOption = {
  id: string;
  name: string;
  email: string;
};

export function userContactLabel(
  users: CompanyUserOption[],
  userId?: string,
  fallback?: string
): string {
  const user = users.find((u) => u.id === userId);
  if (user) return user.name;
  return fallback?.trim() || "";
}

export function resolveContactUserId(
  users: CompanyUserOption[],
  userId?: string,
  fallbackName?: string
): string {
  if (userId && users.some((u) => u.id === userId)) return userId;
  if (fallbackName) {
    const byName = users.find((u) => u.name === fallbackName);
    if (byName) return byName.id;
  }
  return "";
}
