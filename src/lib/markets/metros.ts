/**
 * ZIP → metro playbook for Phase 3 city expansion.
 * Config-first (no DB required); extend ZIPs as new markets open.
 */

export type MetroId =
  | "lafayette"
  | "lake-charles"
  | "new-iberia"
  | "opelousas"
  | "crowley"
  | "other-swla";

export type MetroDefinition = {
  id: MetroId;
  label: string;
  shortLabel: string;
  /** Hero / CTA localization phrase. */
  trainWithUs: string;
  heroSupport: string;
  zips: readonly string[];
};

export const METROS: readonly MetroDefinition[] = [
  {
    id: "lafayette",
    label: "Lafayette metro",
    shortLabel: "Lafayette",
    trainWithUs: "Train with us in Lafayette",
    heroSupport:
      "Free workouts, meal plans, and grocery lists for Lafayette / Acadiana athletes and families.",
    zips: [
      "70501",
      "70502",
      "70503",
      "70504",
      "70505",
      "70506",
      "70507",
      "70508",
      "70509",
      "70518",
      "70520",
      "70529",
      "70558",
      "70583",
      "70592",
    ],
  },
  {
    id: "lake-charles",
    label: "Lake Charles metro",
    shortLabel: "Lake Charles",
    trainWithUs: "Train with us in Lake Charles",
    heroSupport:
      "Bring Vitality Engine to Lake Charles: log sessions, plan meals, share the grocery list.",
    zips: ["70601", "70602", "70605", "70606", "70607", "70611", "70615"],
  },
  {
    id: "new-iberia",
    label: "New Iberia / Iberia Parish",
    shortLabel: "New Iberia",
    trainWithUs: "Train with us in New Iberia",
    heroSupport:
      "Free Vitality Engine for New Iberia and Iberia Parish: workouts + meal plans close to home.",
    zips: ["70560", "70562", "70563"],
  },
  {
    id: "opelousas",
    label: "Opelousas / St. Landry",
    shortLabel: "Opelousas",
    trainWithUs: "Train with us in Opelousas",
    heroSupport:
      "Free workouts and meal plans for Opelousas / St. Landry athletes.",
    zips: ["70570", "70571"],
  },
  {
    id: "crowley",
    label: "Crowley / Acadia Parish",
    shortLabel: "Crowley",
    trainWithUs: "Train with us in Crowley",
    heroSupport:
      "Vitality Engine for Crowley and Acadia Parish: train, fuel, compete.",
    zips: ["70526", "70527"],
  },
  {
    id: "other-swla",
    label: "Other Southwest Louisiana",
    shortLabel: "SWLA",
    trainWithUs: "Train with us across Southwest Louisiana",
    heroSupport:
      "Free Vitality Engine account: workouts, meal plans, and grocery lists for SWLA.",
    zips: ["70510", "70528", "70533", "70542", "70546", "70548", "70555"],
  },
] as const;

const ZIP_TO_METRO = new Map<string, MetroId>();
for (const metro of METROS) {
  for (const zip of metro.zips) {
    ZIP_TO_METRO.set(zip, metro.id);
  }
}

const METRO_BY_ID = new Map(METROS.map((m) => [m.id, m]));

export function metroForZip(zip: string | null | undefined): MetroId | null {
  if (!zip) return null;
  const zip5 = zip.replace(/\D/g, "").slice(0, 5);
  if (!zip5) return null;
  return ZIP_TO_METRO.get(zip5) ?? null;
}

export function getMetro(id: string | null | undefined): MetroDefinition | null {
  if (!id) return null;
  const cleaned = id.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return METRO_BY_ID.get(cleaned as MetroId) ?? null;
}

/** Normalize `?market=` query to a known metro id. */
export function normalizeMarketParam(
  value: string | null | undefined,
): MetroId | null {
  const metro = getMetro(value);
  return metro?.id ?? null;
}

export function marketSignupCopy(market: MetroId | null | undefined): {
  trainWithUs: string;
  heroSupport: string;
  shortLabel: string;
} {
  const metro = market ? getMetro(market) : null;
  if (metro) {
    return {
      trainWithUs: metro.trainWithUs,
      heroSupport: metro.heroSupport,
      shortLabel: metro.shortLabel,
    };
  }
  return {
    trainWithUs: "Train with us across Southwest Louisiana",
    heroSupport:
      "Free workouts, meal plans, and grocery lists built for how SWLA trains and eats.",
    shortLabel: "SWLA",
  };
}

/** ZIP list for a metro playbook id (empty when unknown). */
export function zipsForMarket(market: MetroId | string | null | undefined): string[] {
  const metro = getMetro(market);
  return metro ? [...metro.zips] : [];
}

/** Union of ZIPs for one or more market ids. */
export function zipsForMarkets(
  markets: readonly (MetroId | string)[] | null | undefined,
): string[] {
  if (!markets?.length) return [];
  const set = new Set<string>();
  for (const id of markets) {
    for (const zip of zipsForMarket(id)) set.add(zip);
  }
  return [...set];
}
