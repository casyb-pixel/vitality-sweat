/**
 * HOUSE RULE: Never use em dashes (—) or en dashes (–) in product copy,
 * AI prompts/outputs, marketing posts, emails, or social captions.
 *
 * Why: Typographic dashes are a common AI tell. Prefer commas, periods,
 * colons, or a plain hyphen (-) so copy reads human-written.
 *
 * Every Gemini / marketing generator should:
 * 1. Include `NO_EM_DASH_RULE` in the system/prompt instructions
 * 2. Run `stripEmDashes` (or `stripEmDashesDeep`) on model output before save/post
 */

/**
 * Strip typographic dashes that make AI copy feel obvious.
 * Em dash (—) and en dash (–) → plain hyphenated phrasing.
 */
export function stripEmDashes(input: string): string {
  return input
    .replace(/\u2014/g, " - ") // —
    .replace(/\u2013/g, " - ") // –
    .replace(/\u2212/g, "-") // minus sign
    .replace(/ {2,}/g, " ")
    .replace(/ - -/g, " -")
    .trim();
}

/** Recursively sanitize string fields on plain objects / arrays. */
export function stripEmDashesDeep<T>(value: T): T {
  if (typeof value === "string") {
    return stripEmDashes(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => stripEmDashesDeep(item)) as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(
      value as Record<string, unknown>,
    )) {
      out[key] = stripEmDashesDeep(nested);
    }
    return out as T;
  }
  return value;
}

/** Paste into every AI prompt that writes user-facing or publishable text. */
export const NO_EM_DASH_RULE =
  "HOUSE RULE: Never use em dashes (—) or en dashes (–). They look AI-generated. Use commas, periods, colons, or a simple hyphen (-) instead.";
