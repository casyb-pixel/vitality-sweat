import { GoogleGenAI } from "@google/genai";

/** Default target — override with GEMINI_MODEL (e.g. gemini-2.0-flash, gemini-2.5-pro). */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  return key || undefined;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
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
