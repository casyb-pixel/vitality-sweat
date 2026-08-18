/** Engine Room game calendar. Weeks and streaks use America/Chicago. */

export const ENGINE_TZ = "America/Chicago";

const GRACE_DAYS = 3;

export function chicagoDateString(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ENGINE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function parseDateOnly(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  return { y, m, d };
}

function utcNoonMs(dateStr: string): number | null {
  const parsed = parseDateOnly(dateStr);
  if (!parsed) return null;
  return Date.UTC(parsed.y, parsed.m - 1, parsed.d, 12, 0, 0);
}

export function addDays(dateStr: string, days: number): string | null {
  const ms = utcNoonMs(dateStr);
  if (ms == null) return null;
  const next = new Date(ms + days * 24 * 60 * 60 * 1000);
  const y = next.getUTCFullYear();
  const m = String(next.getUTCMonth() + 1).padStart(2, "0");
  const d = String(next.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function daysBetween(from: string, to: string): number | null {
  const a = utcNoonMs(from);
  const b = utcNoonMs(to);
  if (a == null || b == null) return null;
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/** Monday as the first day of the Engine Room week. */
export function chicagoWeekStart(dateStr: string): string | null {
  const ms = utcNoonMs(dateStr);
  if (ms == null) return null;
  const dow = new Date(ms).getUTCDay();
  const offset = dow === 0 ? 6 : dow - 1;
  return addDays(dateStr, -offset);
}

export function isWithinPostingGrace(lastPostedOn: string, postedOn: string): boolean {
  const gap = daysBetween(lastPostedOn, postedOn);
  if (gap == null) return false;
  return gap >= 0 && gap <= GRACE_DAYS;
}

export { GRACE_DAYS };
