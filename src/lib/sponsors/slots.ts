/**
 * Canonical sponsorship slot registry for Vitality Sweat / Engine.
 * Blog mid slots use growth packaging ids like `blog-mid-{slug}` and
 * resolve to inventory key `blog-inline`.
 */

export type SponsorSlotSize = "banner" | "rectangle" | "leaderboard";

export type SponsorSlotDefinition = {
  id: string;
  label: string;
  description: string;
  size: SponsorSlotSize;
  /** Surfaces where this slot appears. */
  surfaces: string[];
};

export const SPONSOR_SLOTS: readonly SponsorSlotDefinition[] = [
  {
    id: "home-below-hero",
    label: "Home · below hero",
    description: "Primary home placement under the hero.",
    size: "leaderboard",
    surfaces: ["home"],
  },
  {
    id: "home-mid-content",
    label: "Home · mid content",
    description: "Secondary home band between content sections.",
    size: "banner",
    surfaces: ["home"],
  },
  {
    id: "chronicles-top",
    label: "Chronicles · top",
    description: "Top of the Sweatlife Chronicles index.",
    size: "banner",
    surfaces: ["chronicles"],
  },
  {
    id: "blog-inline",
    label: "Blog · inline (mid)",
    description:
      "Mid-article placement. Covers all blog-mid-{slug} growth packaging ids.",
    size: "banner",
    surfaces: ["blog"],
  },
  {
    id: "blog-end",
    label: "Blog · end",
    description: "End-of-article partner placement (optional).",
    size: "banner",
    surfaces: ["blog"],
  },
  {
    id: "grocery-footer",
    label: "Grocery share · footer",
    description: "Footer on public grocery share pages.",
    size: "banner",
    surfaces: ["grocery"],
  },
  {
    id: "app-home",
    label: "App · home",
    description: "Member app home (when wired).",
    size: "banner",
    surfaces: ["app"],
  },
] as const;

export type SponsorSlotId = (typeof SPONSOR_SLOTS)[number]["id"];

const SLOT_BY_ID = new Map(SPONSOR_SLOTS.map((s) => [s.id, s]));

/** Map concrete page slot ids (including blog-mid-*) to inventory keys. */
export function resolveInventorySlotId(slotId: string): string {
  const cleaned = slotId.trim().toLowerCase();
  if (!cleaned) return "blog-inline";
  if (cleaned.startsWith("blog-mid-")) return "blog-inline";
  if (SLOT_BY_ID.has(cleaned)) return cleaned;
  return cleaned;
}

export function getSlotDefinition(
  slotId: string,
): SponsorSlotDefinition | null {
  const inventoryId = resolveInventorySlotId(slotId);
  return SLOT_BY_ID.get(inventoryId) ?? null;
}

export function isKnownSponsorSlot(slotId: string): boolean {
  return SLOT_BY_ID.has(resolveInventorySlotId(slotId));
}
