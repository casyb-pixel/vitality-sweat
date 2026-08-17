import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { stripEmDashes } from "@/lib/text/humanize-copy";

export const runtime = "nodejs";

const ENGINE_ROOM_BUCKET = "engine-room";

async function member() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  path: string | null,
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(ENGINE_ROOM_BUCKET)
    .createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export async function GET() {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data: posts, error } = await supabase
    .from("engine_room_posts")
    .select(
      "id, author_id, kind, body, image_path, milestone_payload, created_at",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const postIds = (posts ?? []).map((p) => p.id as string);

  const [{ data: reactions }, { data: comments }] = await Promise.all([
    postIds.length
      ? supabase
          .from("engine_room_reactions")
          .select("post_id, user_id, kind")
          .in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string; user_id: string; kind: string }[] }),
    postIds.length
      ? supabase
          .from("engine_room_comments")
          .select("id, post_id, author_id, body, created_at")
          .is("deleted_at", null)
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; post_id: string; author_id: string; body: string; created_at: string }[] }),
  ]);

  const authorIds = [
    ...new Set([
      ...(posts ?? []).map((p) => p.author_id as string),
      ...(comments ?? []).map((c) => c.author_id as string),
    ]),
  ];

  const { data: profiles } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, username")
        .in("id", authorIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, p]),
  );

  const feed = await Promise.all(
    (posts ?? []).map(async (post) => {
      const imageUrl = await signedUrl(
        supabase,
        typeof post.image_path === "string" ? post.image_path : null,
      );
      const author = profileMap.get(post.author_id as string);
      return {
        ...post,
        image_url: imageUrl,
        author: {
          id: post.author_id,
          display_name: author?.display_name ?? null,
          username: author?.username ?? null,
        },
        reactions: (reactions ?? []).filter((r) => r.post_id === post.id),
        comments: (comments ?? [])
          .filter((c) => c.post_id === post.id)
          .map((c) => ({
            ...c,
            author: profileMap.get(c.author_id as string) ?? null,
          })),
      };
    }),
  );

  const { data: me } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: fitness } = await supabase
    .from("fitness_profiles")
    .select("leaderboard_opt_in")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    posts: feed,
    me: {
      id: user.id,
      username: me?.username ?? null,
      display_name: me?.display_name ?? null,
      leaderboard_opt_in: fitness?.leaderboard_opt_in !== false,
    },
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.username) {
    return NextResponse.json(
      { ok: false, error: "Set a username in Settings before posting." },
      { status: 400 },
    );
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, error: "Send form data." }, { status: 400 });
  }

  const kindRaw = String(form.get("kind") ?? "text");
  const kind =
    kindRaw === "photo" || kindRaw === "win" || kindRaw === "promo"
      ? kindRaw
      : "text";
  const body = stripEmDashes(String(form.get("body") ?? "").trim());
  const photoConfirm = String(form.get("photo_confirm") ?? "") === "1";
  const milestoneRaw = String(form.get("milestone") ?? "");
  let milestonePayload: Record<string, unknown> | null = null;
  if (milestoneRaw) {
    try {
      milestonePayload = JSON.parse(milestoneRaw) as Record<string, unknown>;
    } catch {
      milestonePayload = null;
    }
  }

  if (kind === "photo" && !photoConfirm) {
    return NextResponse.json(
      {
        ok: false,
        error: "Confirm you are 18+ and no minors are in this photo.",
      },
      { status: 400 },
    );
  }
  if (kind === "text" && !body) {
    return NextResponse.json(
      { ok: false, error: "Write something to post." },
      { status: 400 },
    );
  }

  let imagePath: string | null = null;
  const file = form.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!photoConfirm) {
      return NextResponse.json(
        {
          ok: false,
          error: "Confirm you are 18+ and no minors are in this photo.",
        },
        { status: 400 },
      );
    }
    if (file.size > 8_000_000) {
      return NextResponse.json(
        { ok: false, error: "Photo is too large (max about 8MB)." },
        { status: 400 },
      );
    }
    const ext = file.type.includes("webp")
      ? "webp"
      : file.type.includes("png")
        ? "png"
        : "jpg";
    imagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from(ENGINE_ROOM_BUCKET)
      .upload(imagePath, await file.arrayBuffer(), {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });
    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: uploadError.message },
        { status: 500 },
      );
    }
  }

  const { data, error } = await supabase
    .from("engine_room_posts")
    .insert({
      author_id: user.id,
      kind: imagePath ? "photo" : kind,
      body,
      image_path: imagePath,
      milestone_payload: milestonePayload,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: data.id });
}
