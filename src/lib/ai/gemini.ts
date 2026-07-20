import { GoogleGenAI } from "@google/genai";

/** Default text model — override with GEMINI_MODEL. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

/** Default image model — override with GEMINI_IMAGE_MODEL. */
export const DEFAULT_GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function getGeminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL?.trim() || DEFAULT_GEMINI_IMAGE_MODEL;
}

/**
 * Initializes the official Google Gen AI client from GEMINI_API_KEY.
 * Throws if the key is missing so callers can return a clean 503.
 */
export function createGeminiClient(apiKey = getGeminiApiKey()): GoogleGenAI {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey });
}

export function isLikelyConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("fetch failed") ||
    msg.includes("network") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("socket") ||
    msg.includes("disconnected") ||
    msg.includes("unavailable") ||
    msg.includes("timeout")
  );
}
