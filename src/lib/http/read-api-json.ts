/**
 * Safely parse a fetch Response as JSON.
 * Safari throws "The string did not match the expected pattern." when
 * `response.json()` gets HTML (gateway timeout / crash page) instead of JSON.
 */
export async function readApiJson<T = unknown>(
  res: Response,
  options?: { timeoutHint?: string },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const raw = await res.text();
  const trimmed = raw.trim();
  const timeoutHint =
    options?.timeoutHint?.trim() ||
    "The AI service timed out or crashed before sending a response. Try again in a moment.";

  if (!trimmed) {
    return {
      ok: false,
      error: res.ok
        ? "Empty response from the server. Try again."
        : `Request failed (${res.status}). Try again in a moment.`,
    };
  }

  try {
    return { ok: true, data: JSON.parse(trimmed) as T };
  } catch {
    const looksHtml = /^\s*</.test(trimmed) || /<!DOCTYPE/i.test(trimmed);
    if (looksHtml || res.status >= 502) {
      // Prefer any JSON-ish error fragment inside gateway HTML when present.
      const embedded = trimmed.match(/"error"\s*:\s*"([^"]+)"/);
      if (embedded?.[1]) {
        return { ok: false, error: embedded[1] };
      }
      return {
        ok: false,
        error: timeoutHint,
      };
    }
    return {
      ok: false,
      error: `Unexpected server response (${res.status}). Try again.`,
    };
  }
}
