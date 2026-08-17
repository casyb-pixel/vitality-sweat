import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";
import {
  ENCYCLOPEDIA_PAGES,
  getEncyclopediaPage,
  type EncyclopediaPage,
} from "@/lib/fitness/encyclopedia";

export type PublicExercise = {
  id: string;
  slug: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  tracking_type: string | null;
  cues: string[] | null;
  how_to: string | null;
  youtube_url: string | null;
  aliases: string[] | null;
};

function encyclopediaAsExercise(page: EncyclopediaPage): PublicExercise {
  return {
    id: `encyclopedia:${page.slug}`,
    slug: page.slug,
    name: page.name,
    primary_muscle: page.primaryMuscle,
    equipment: page.equipment,
    tracking_type: page.trackingType,
    cues: page.cues,
    how_to: page.lede,
    youtube_url: null,
    aliases: null,
  };
}

function overlayEncyclopedia(
  row: PublicExercise,
  page: EncyclopediaPage | undefined,
): PublicExercise {
  if (!page) return row;
  return {
    ...row,
    name: page.name,
    primary_muscle: page.primaryMuscle,
    equipment: page.equipment,
    tracking_type: page.trackingType,
    cues: page.cues,
    how_to: page.lede,
  };
}

async function reader() {
  return createServiceRoleClient() ?? (await createClient());
}

export function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getPublicExercises(): Promise<PublicExercise[]> {
  try {
    const supabase = await reader();
    const { data, error } = await supabase
      .from("exercises")
      .select(
        "id, slug, name, primary_muscle, equipment, tracking_type, cues, how_to, youtube_url, aliases",
      )
      .eq("is_active", true)
      .is("created_by", null)
      .order("name")
      .limit(800);
    if (error || !data) {
      return ENCYCLOPEDIA_PAGES.map(encyclopediaAsExercise);
    }
    const fromDb = (data as PublicExercise[]).map((row) => {
      const slug = row.slug || slugFromName(row.name);
      const page = getEncyclopediaPage(slug);
      return overlayEncyclopedia({ ...row, slug }, page);
    });
    const have = new Set(fromDb.map((row) => row.slug));
    for (const page of ENCYCLOPEDIA_PAGES) {
      if (!have.has(page.slug)) {
        fromDb.push(encyclopediaAsExercise(page));
      }
    }
    return fromDb.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return ENCYCLOPEDIA_PAGES.map(encyclopediaAsExercise);
  }
}

export async function getPublicExercise(
  slug: string,
): Promise<PublicExercise | null> {
  const page = getEncyclopediaPage(slug);
  const all = await getPublicExercises();
  const fromList = all.find((ex) => ex.slug === slug);
  if (fromList) return fromList;
  return page ? encyclopediaAsExercise(page) : null;
}
