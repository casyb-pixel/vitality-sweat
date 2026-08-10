/**
 * Creator Studio audience density helpers for local sponsorship pitches.
 * Aggregates only — never return member emails or other PII.
 */

/** Lafayette core ZIPs commonly used in local gym/grocery pitches. */
export const LAFAYETTE_CORE_ZIPS = [
  "70501",
  "70502",
  "70503",
  "70504",
  "70505",
  "70506",
  "70507",
  "70508",
] as const;

/** Broader Acadiana / Lafayette-area ZIPs for highlights. */
export const ACADIANA_FOCUS_ZIPS = [
  ...LAFAYETTE_CORE_ZIPS,
  "70509",
  "70510",
  "70518",
  "70520",
  "70529",
  "70558",
  "70560",
  "70570",
  "70583",
  "70592",
] as const;

export const AUDIENCE_WINDOW_DAYS = 28;

export type AudienceZipRow = {
  zipCode: string;
  city: string | null;
  region: string | null;
  registered: number;
  active28d: number;
  /** Members in this ZIP who signed up via a referral code. */
  referred: number;
  /** True when ZIP is in the Acadiana / Lafayette focus set. */
  isFocus: boolean;
};

export type AudienceCityRow = {
  city: string;
  registered: number;
  active28d: number;
  referred: number;
};

export type AudienceMetrics = {
  windowDays: number;
  since: string;
  /** Clear product definition mirrored in the API response. */
  activeDefinition: string;
  registeredWithZip: number;
  registeredTotal: number;
  activeUsers28d: number;
  activeUsersWithZip28d: number;
  workoutsLogged28d: number;
  groceryListsCreated28d: number;
  /** Meal plans in-window that include a share token (all plans do). */
  groceryListsShareable28d: number;
  lafayetteCoreActive28d: number;
  acadianaFocusActive28d: number;
  /** Profiles with referred_by set (platform-wide). */
  referredTotal: number;
  /** Referred members who also have a ZIP on file. */
  referredWithZip: number;
  byZip: AudienceZipRow[];
  byCity: AudienceCityRow[];
  pitchSummary: string;
};

export const ACTIVE_DEFINITION =
  "Active (28d) = member with ≥1 workout session started OR ≥1 meal plan created/updated in the last 28 days.";

export function normalizeZip5(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const digits = zip.trim().replace(/\s+/g, "");
  const match = /^(\d{5})(?:-\d{4})?$/.exec(digits);
  return match?.[1] ?? null;
}

export function isFocusZip(zip5: string): boolean {
  return (ACADIANA_FOCUS_ZIPS as readonly string[]).includes(zip5);
}

export function isLafayetteCoreZip(zip5: string): boolean {
  return (LAFAYETTE_CORE_ZIPS as readonly string[]).includes(zip5);
}

type ProfileGeoRow = {
  id: string;
  city: string | null;
  zip_code: string | null;
  region: string | null;
  referred_by?: string | null;
};

type WorkoutRow = { user_id: string; id: string };
type MealPlanRow = {
  user_id: string;
  id: string;
  grocery_share_token: string | null;
};

export function buildAudienceMetrics(input: {
  sinceIso: string;
  profiles: ProfileGeoRow[];
  registeredTotal: number;
  referredTotal?: number;
  workouts: WorkoutRow[];
  mealPlans: MealPlanRow[];
}): AudienceMetrics {
  const focusSet = new Set<string>(ACADIANA_FOCUS_ZIPS);
  const coreSet = new Set<string>(LAFAYETTE_CORE_ZIPS);

  const profilesWithZip = input.profiles.filter(
    (p) => normalizeZip5(p.zip_code) != null,
  );

  const activeIds = new Set<string>();
  for (const row of input.workouts) activeIds.add(row.user_id);
  for (const row of input.mealPlans) activeIds.add(row.user_id);

  const profileById = new Map(profilesWithZip.map((p) => [p.id, p]));

  const zipBuckets = new Map<
    string,
    {
      city: string | null;
      region: string | null;
      registeredIds: Set<string>;
      activeIds: Set<string>;
      referredIds: Set<string>;
    }
  >();

  const cityBuckets = new Map<
    string,
    {
      registeredIds: Set<string>;
      activeIds: Set<string>;
      referredIds: Set<string>;
    }
  >();

  let referredWithZip = 0;

  for (const profile of profilesWithZip) {
    const zip5 = normalizeZip5(profile.zip_code);
    if (!zip5) continue;
    const isReferred = Boolean(profile.referred_by);
    if (isReferred) referredWithZip += 1;

    let zipBucket = zipBuckets.get(zip5);
    if (!zipBucket) {
      zipBucket = {
        city: profile.city?.trim() || null,
        region: profile.region?.trim() || null,
        registeredIds: new Set(),
        activeIds: new Set(),
        referredIds: new Set(),
      };
      zipBuckets.set(zip5, zipBucket);
    }
    zipBucket.registeredIds.add(profile.id);
    if (
      profile.city?.trim() &&
      (!zipBucket.city || zipBucket.city.length < profile.city.trim().length)
    ) {
      zipBucket.city = profile.city.trim();
    }
    if (profile.region?.trim() && !zipBucket.region) {
      zipBucket.region = profile.region.trim();
    }
    if (activeIds.has(profile.id)) {
      zipBucket.activeIds.add(profile.id);
    }
    if (isReferred) {
      zipBucket.referredIds.add(profile.id);
    }

    const cityKey = profile.city?.trim() || "Unknown city";
    let cityBucket = cityBuckets.get(cityKey);
    if (!cityBucket) {
      cityBucket = {
        registeredIds: new Set(),
        activeIds: new Set(),
        referredIds: new Set(),
      };
      cityBuckets.set(cityKey, cityBucket);
    }
    cityBucket.registeredIds.add(profile.id);
    if (activeIds.has(profile.id)) {
      cityBucket.activeIds.add(profile.id);
    }
    if (isReferred) {
      cityBucket.referredIds.add(profile.id);
    }
  }

  const byZip: AudienceZipRow[] = [...zipBuckets.entries()]
    .map(([zipCode, b]) => ({
      zipCode,
      city: b.city,
      region: b.region,
      registered: b.registeredIds.size,
      active28d: b.activeIds.size,
      referred: b.referredIds.size,
      isFocus: focusSet.has(zipCode),
    }))
    .sort((a, b) => {
      if (a.isFocus !== b.isFocus) return a.isFocus ? -1 : 1;
      if (b.active28d !== a.active28d) return b.active28d - a.active28d;
      if (b.registered !== a.registered) return b.registered - a.registered;
      return a.zipCode.localeCompare(b.zipCode);
    });

  const byCity: AudienceCityRow[] = [...cityBuckets.entries()]
    .map(([city, b]) => ({
      city,
      registered: b.registeredIds.size,
      active28d: b.activeIds.size,
      referred: b.referredIds.size,
    }))
    .sort((a, b) => {
      if (b.active28d !== a.active28d) return b.active28d - a.active28d;
      return b.registered - a.registered;
    });

  let lafayetteCoreActive28d = 0;
  let acadianaFocusActive28d = 0;
  for (const row of byZip) {
    if (coreSet.has(row.zipCode)) lafayetteCoreActive28d += row.active28d;
    if (focusSet.has(row.zipCode)) acadianaFocusActive28d += row.active28d;
  }

  let activeUsersWithZip28d = 0;
  for (const id of activeIds) {
    if (profileById.has(id)) activeUsersWithZip28d += 1;
  }

  const groceryListsCreated28d = input.mealPlans.length;
  const groceryListsShareable28d = input.mealPlans.filter(
    (p) => p.grocery_share_token,
  ).length;

  const referredTotal = input.referredTotal ?? 0;

  const pitchSummary = buildPitchSummary({
    lafayetteCoreActive28d,
    acadianaFocusActive28d,
    byZip,
    workoutsLogged28d: input.workouts.length,
    groceryListsCreated28d,
    activeUsers28d: activeIds.size,
    registeredWithZip: profilesWithZip.length,
    referredTotal,
    referredWithZip,
  });

  return {
    windowDays: AUDIENCE_WINDOW_DAYS,
    since: input.sinceIso,
    activeDefinition: ACTIVE_DEFINITION,
    registeredWithZip: profilesWithZip.length,
    registeredTotal: input.registeredTotal,
    activeUsers28d: activeIds.size,
    activeUsersWithZip28d,
    workoutsLogged28d: input.workouts.length,
    groceryListsCreated28d,
    groceryListsShareable28d,
    lafayetteCoreActive28d,
    acadianaFocusActive28d,
    referredTotal,
    referredWithZip,
    byZip,
    byCity,
    pitchSummary,
  };
}

export function buildPitchSummary(input: {
  lafayetteCoreActive28d: number;
  acadianaFocusActive28d: number;
  byZip: AudienceZipRow[];
  workoutsLogged28d: number;
  groceryListsCreated28d: number;
  activeUsers28d: number;
  registeredWithZip: number;
  referredTotal: number;
  referredWithZip: number;
}): string {
  const lines: string[] = [];
  lines.push(
    `${input.lafayetteCoreActive28d} active member${input.lafayetteCoreActive28d === 1 ? "" : "s"} in ZIP 70501–70508 (last 28 days).`,
  );
  lines.push(
    `${input.acadianaFocusActive28d} active in broader Acadiana / Lafayette-area focus ZIPs.`,
  );
  lines.push(
    `${input.registeredWithZip} registered members with ZIP on file · ${input.activeUsers28d} active platform-wide · ${input.workoutsLogged28d} workouts logged · ${input.groceryListsCreated28d} grocery lists created.`,
  );
  lines.push(
    `${input.referredTotal} referred signups platform-wide · ${input.referredWithZip} referred with ZIP (local virality).`,
  );

  const topFocus = input.byZip
    .filter((z) => z.isFocus && (z.active28d > 0 || z.registered > 0))
    .slice(0, 6);
  if (topFocus.length) {
    const detail = topFocus
      .map(
        (z) =>
          `${z.zipCode}${z.city ? ` (${z.city})` : ""}: ${z.active28d} active / ${z.registered} registered / ${z.referred} referred`,
      )
      .join("; ");
    lines.push(`Top focus ZIPs — ${detail}.`);
  } else {
    lines.push(
      "No ZIP-tagged members in the Acadiana focus set yet — empty state, not estimated.",
    );
  }

  lines.push(
    `Active definition: ${ACTIVE_DEFINITION.replace("Active (28d) = ", "")}`,
  );

  return lines.join("\n");
}
