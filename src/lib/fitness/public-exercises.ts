import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

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
    if (error || !data) return [];
    return (data as PublicExercise[]).map((row) => ({
      ...row,
      slug: row.slug || slugFromName(row.name),
    }));
  } catch {
    return [];
  }
}

export async function getPublicExercise(
  slug: string,
): Promise<PublicExercise | null> {
  const all = await getPublicExercises();
  return all.find((ex) => ex.slug === slug) ?? null;
}
