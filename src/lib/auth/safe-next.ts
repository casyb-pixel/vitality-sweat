/**
 * Only allow same-origin relative paths for post-login redirects.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next) return fallback;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  return trimmed;
}

export function creatorStudioNext(next: string | null | undefined): string {
  return sanitizeNextPath(next, "/app/creator");
}
