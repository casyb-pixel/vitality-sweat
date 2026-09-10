import { signupHref } from "@/lib/analytics/ga";
import { resolveInventorySlotId } from "@/lib/sponsors/slots";

export type HousePromoId = "engine-room" | "fuel";

export type HousePromo = {
  id: HousePromoId;
  eyebrow: string;
  headline: string;
  body: string;
  ctaLabel: string;
  imageSrc: string;
  imageAlt: string;
  imageClassName: string;
};

export const HOUSE_PROMOS: Record<HousePromoId, HousePromo> = {
  "engine-room": {
    id: "engine-room",
    eyebrow: "The Engine Room",
    headline: "Post the work. Keep the streak.",
    body: "Ranks, weekly quests, and the people showing up this week. Free with your Engine account.",
    ctaLabel: "Enter the Engine Room",
    imageSrc: "/images/stock/fitness/stair-runners.jpg",
    imageAlt: "Two athletes running stadium stairs under a clear sky",
    imageClassName: "object-cover object-[center_25%]",
  },
  fuel: {
    id: "fuel",
    eyebrow: "Fuel",
    headline: "Meals that survive a real week.",
    body: "Protein, groceries, and plan notes for Southwest Louisiana. Eat like training actually matters.",
    ctaLabel: "Open Fuel",
    imageSrc:
      "/images/blog/blogger/meal-prep-made-easy-step-by-step-guide-05-create-me-an-image-of-a-delicious-lookin.jpg",
    imageAlt: "Colorful meal prep bowls with fruit, lentils, and a green smoothie",
    imageClassName: "object-cover object-center",
  },
};

const SLOT_PROMO: Record<string, HousePromoId> = {
  "home-below-hero": "engine-room",
  "home-mid-content": "fuel",
  "chronicles-top": "engine-room",
  "blog-inline": "fuel",
  "blog-end": "engine-room",
  "grocery-footer": "fuel",
  "app-home": "engine-room",
  "tools-inline": "fuel",
  "exercise-sidebar": "engine-room",
  "program-end": "fuel",
};

export function pickHousePromo(slotId: string): HousePromo {
  const inventory = resolveInventorySlotId(slotId);
  const mapped = SLOT_PROMO[inventory];
  if (mapped) return HOUSE_PROMOS[mapped];

  let hash = 0;
  for (const ch of inventory) hash = (hash + ch.charCodeAt(0)) % 2;
  return hash === 0 ? HOUSE_PROMOS["engine-room"] : HOUSE_PROMOS.fuel;
}

export function isMemberAppPath(pathname: string | null | undefined): boolean {
  return Boolean(pathname?.startsWith("/app"));
}

/** Destination for a house promo. Public Engine Room traffic goes through signup. */
export function housePromoHref(
  promo: HousePromo,
  opts: { memberApp: boolean; slotId?: string },
): string {
  if (promo.id === "engine-room") {
    if (opts.memberApp) return "/app/engine-room";
    return signupHref("/app/engine-room", {
      utmSource: "house",
      utmMedium: "slot",
      utmCampaign: "engine_room",
      utmContent: opts.slotId ?? null,
    });
  }
  return opts.memberApp ? "/app/nutrition" : "/fuel";
}
