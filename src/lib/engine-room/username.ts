const USERNAME_RE = /^[a-z0-9_]{3,32}$/;

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function parseUsername(
  raw: unknown,
): { ok: true; username: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Send a username." };
  }
  const username = normalizeUsername(raw);
  if (!username) {
    return { ok: false, error: "Send a username." };
  }
  if (!USERNAME_RE.test(username)) {
    return {
      ok: false,
      error: "Use 3-32 letters, numbers, or underscores.",
    };
  }
  return { ok: true, username };
}
