import type { SupabaseClient } from "@supabase/supabase-js";
import {
  gymNameKey,
  normalizeGymName,
  type GymOption,
} from "@/lib/gyms/names";

export async function listGymOptions(
  supabase: SupabaseClient,
): Promise<GymOption[]> {
  const [{ data: partners }, { data: directory }] = await Promise.all([
    supabase
      .from("gym_locations")
      .select("id, name, metro")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("gym_directory")
      .select("id, name, metro")
      .order("name")
      .limit(400),
  ]);

  const seen = new Set<string>();
  const out: GymOption[] = [];
  for (const row of partners ?? []) {
    const key = gymNameKey(String(row.name));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `partner:${row.id}`,
      name: String(row.name),
      metro: (row.metro as string | null) ?? null,
      source: "partner",
    });
  }
  for (const row of directory ?? []) {
    const key = gymNameKey(String(row.name));
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `directory:${row.id}`,
      name: String(row.name),
      metro: (row.metro as string | null) ?? null,
      source: "directory",
    });
  }
  return out;
}

export async function resolveGymCheckIn(
  supabase: SupabaseClient,
  userId: string,
  input: { gymName?: string | null; gymOptionId?: string | null },
): Promise<{
  gym_name: string | null;
  gym_location_id: string | null;
  gym_directory_id: string | null;
}> {
  const optionId = input.gymOptionId?.trim() || null;
  if (optionId?.startsWith("partner:")) {
    const id = optionId.slice("partner:".length);
    const { data } = await supabase
      .from("gym_locations")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      return {
        gym_name: String(data.name),
        gym_location_id: data.id as string,
        gym_directory_id: null,
      };
    }
  }
  if (optionId?.startsWith("directory:")) {
    const id = optionId.slice("directory:".length);
    const { data } = await supabase
      .from("gym_directory")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      return {
        gym_name: String(data.name),
        gym_location_id: null,
        gym_directory_id: data.id as string,
      };
    }
  }

  const name = normalizeGymName(input.gymName ?? "");
  if (!name) {
    return {
      gym_name: null,
      gym_location_id: null,
      gym_directory_id: null,
    };
  }

  const key = gymNameKey(name);
  const { data: partner } = await supabase
    .from("gym_locations")
    .select("id, name")
    .ilike("name", name)
    .eq("is_active", true)
    .maybeSingle();
  if (partner) {
    return {
      gym_name: String(partner.name),
      gym_location_id: partner.id as string,
      gym_directory_id: null,
    };
  }

  const { data: existing } = await supabase
    .from("gym_directory")
    .select("id, name")
    .eq("name_key", key)
    .maybeSingle();
  if (existing) {
    return {
      gym_name: String(existing.name),
      gym_location_id: null,
      gym_directory_id: existing.id as string,
    };
  }

  const { data: created, error } = await supabase
    .from("gym_directory")
    .insert({
      name,
      name_key: key,
      created_by: userId,
    })
    .select("id, name")
    .single();
  if (error || !created) {
    return {
      gym_name: name,
      gym_location_id: null,
      gym_directory_id: null,
    };
  }
  return {
    gym_name: String(created.name),
    gym_location_id: null,
    gym_directory_id: created.id as string,
  };
}

export async function lastGymName(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from("workout_sessions")
    .select("gym_name")
    .eq("user_id", userId)
    .not("gym_name", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const name = typeof data?.gym_name === "string" ? data.gym_name.trim() : "";
  return name || null;
}
