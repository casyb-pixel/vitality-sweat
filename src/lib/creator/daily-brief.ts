import type { SupabaseClient } from "@supabase/supabase-js";

export type CreatorTaskKind =
  | "blog_draft"
  | "blog_publish"
  | "film_howto"
  | "film_app_invite"
  | "post_instagram"
  | "post_tiktok"
  | "post_facebook"
  | "post_x"
  | "approve_covers"
  | "rehearse_script";

const SCHOOL_DAY_CAP = 3;
const WEEKEND_CAP = 5;

export function isSchoolHours(now = new Date(), tzOffsetHours = -5): boolean {
  const local = new Date(now.getTime() + tzOffsetHours * 3600 * 1000);
  const day = local.getUTCDay();
  const hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  const mins = hour * 60 + minute;
  const weekday = day >= 1 && day <= 5;
  // Senior semester: two classes, out at 11:30am America/Chicago.
  return weekday && mins >= 7 * 60 + 20 && mins < 11 * 60 + 30;
}

export async function materializeCreatorTasks(
  supabase: SupabaseClient,
  creatorId: string,
  now = new Date(),
) {
  const cap = now.getDay() === 0 || now.getDay() === 6 ? WEEKEND_CAP : SCHOOL_DAY_CAP;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data: existing } = await supabase
    .from("creator_tasks")
    .select("id")
    .eq("creator_id", creatorId)
    .gte("due_at", start.toISOString())
    .lt("due_at", end.toISOString());

  if ((existing ?? []).length >= cap) {
    const { data } = await supabase
      .from("creator_tasks")
      .select("*")
      .eq("creator_id", creatorId)
      .gte("due_at", start.toISOString())
      .lt("due_at", end.toISOString());
    return data ?? [];
  }

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, slug, status, editorial_status, due_at, ig_post_done, fb_post_done, x_post_done")
    .order("updated_at", { ascending: false })
    .limit(20);

  const rows: Record<string, unknown>[] = [];
  for (const post of posts ?? []) {
    if (rows.length >= cap) break;
    if (post.status === "draft" || post.editorial_status === "draft") {
      rows.push({
        creator_id: creatorId,
        due_at: new Date(start.getTime() + 11.75 * 3600 * 1000).toISOString(),
        kind: "blog_draft",
        title: `Finish draft: ${post.title}`,
        deep_link: `/app/creator?tab=blog&slug=${post.slug}`,
        source_post_id: post.id,
      });
    } else if (post.status === "scheduled") {
      rows.push({
        creator_id: creatorId,
        due_at: post.due_at || end.toISOString(),
        kind: "blog_publish",
        title: `Publish: ${post.title}`,
        deep_link: `/app/creator?tab=blog&slug=${post.slug}`,
        source_post_id: post.id,
      });
    } else if (post.status === "published" && !post.ig_post_done) {
      rows.push({
        creator_id: creatorId,
        due_at: new Date(start.getTime() + 12.5 * 3600 * 1000).toISOString(),
        kind: "post_instagram",
        title: `Post IG promo: ${post.title}`,
        deep_link: `/app/creator?tab=social`,
        source_post_id: post.id,
      });
    }
  }

  if (rows.length < cap) {
    rows.push({
      creator_id: creatorId,
      due_at: new Date(start.getTime() + 13 * 3600 * 1000).toISOString(),
      kind: "film_howto",
      title: "Film one how-to (silent lift, VO at home)",
      deep_link: "/app/creator?tab=video",
    });
  }

  if (rows.length) {
    await supabase.from("creator_tasks").insert(rows.slice(0, cap));
  }

  const { data } = await supabase
    .from("creator_tasks")
    .select("*")
    .eq("creator_id", creatorId)
    .gte("due_at", start.toISOString())
    .lt("due_at", end.toISOString())
    .order("due_at", { ascending: true });
  return data ?? [];
}
