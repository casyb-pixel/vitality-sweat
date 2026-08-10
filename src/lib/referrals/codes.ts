import { absoluteUrl } from "@/lib/seo/site";

const REF_STORAGE_KEY = "vs_referral_ref";

/** Normalize invite codes (VSABCDEF style, case-insensitive). */
export function normalizeReferralCode(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 6 || cleaned.length > 16) return null;
  return cleaned;
}

/** Public signup deep-link that carries referral attribution. */
export function buildInviteUrl(referralCode: string): string {
  const code = normalizeReferralCode(referralCode) ?? referralCode.trim();
  return absoluteUrl(
    `/?auth=signup&next=${encodeURIComponent("/app")}&ref=${encodeURIComponent(code)}`,
  );
}

export function rememberReferralCode(code: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const normalized = normalizeReferralCode(code);
  if (!normalized) return;
  try {
    window.sessionStorage.setItem(REF_STORAGE_KEY, normalized);
  } catch {
    // ignore quota / private mode
  }
}

export function readRememberedReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return normalizeReferralCode(window.sessionStorage.getItem(REF_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function clearRememberedReferralCode(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(REF_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export type ReferralBadge = {
  id: "connector" | "builder" | "champion";
  label: string;
  description: string;
};

export function referralBadgeForCount(count: number): ReferralBadge | null {
  if (count >= 10) {
    return {
      id: "champion",
      label: "Community champion",
      description: "Brought 10+ friends into the Engine.",
    };
  }
  if (count >= 3) {
    return {
      id: "builder",
      label: "Crew builder",
      description: "Brought 3+ training partners.",
    };
  }
  if (count >= 1) {
    return {
      id: "connector",
      label: "Community connector",
      description: "Invited your first friend.",
    };
  }
  return null;
}
