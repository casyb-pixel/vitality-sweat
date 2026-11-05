export const ALERT_WINDOWS = [14, 7, 2] as const;

export function chicagoDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysUntilDeadline(deadline: string, today: string): number {
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${deadline.slice(0, 10)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

export function isAlertWindow(days: number): boolean {
  return (ALERT_WINDOWS as readonly number[]).includes(days);
}
