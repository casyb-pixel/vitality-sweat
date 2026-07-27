/**
 * Safely parse a fetch Response as JSON.
 * Safari throws "The string did not match the expected pattern." when
 * `response.json()` gets HTML (gateway timeout / crash page) instead of JSON.
 */
export async function readApiJson<T = unknown>(
  res: Response,
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const raw = await res.text();
  const trimmed = raw.trim();

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
      return {
        ok: false,
        error:
          "The AI service timed out or crashed before sending a response. Tap Find Trending Angles again — usually works on retry.",
      };
    }
    return {
      ok: false,
      error: `Unexpected server response (${res.status}). Try again.`,
    };
  }
}
