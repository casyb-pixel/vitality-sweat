import { NextResponse } from "next/server";
import { getCreatorRole } from "@/lib/auth/creator";
import { stripEmDashes } from "@/lib/text/humanize-copy";
import {
  parseClockToSeconds,
  parseYouTubeVideoId,
  youtubeWatchUrl,
} from "@/lib/video/youtube-clips";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !getCreatorRole(user)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("videos")
    .select(
      "id, title, description, video_url, source_url, start_sec, end_sec, category, gym_name, exercise_id, is_active, published_at, created_at",
    )
    .not("source_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const { data: exercises } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("is_active", true)
    .order("name")
    .limit(250);

  return NextResponse.json({
    ok: true,
    clips: data ?? [],
    exercises: exercises ?? [],
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !getCreatorRole(user)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: {
    source_url?: string;
    title?: string;
    description?: string;
    start?: string;
    end?: string;
    category?: string;
    gym_name?: string;
    exercise_id?: string | null;
    attach_howto?: boolean;
  } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const sourceUrl = String(body.source_url ?? "").trim();
  const videoId = parseYouTubeVideoId(sourceUrl);
  if (!videoId) {
    return NextResponse.json(
      { ok: false, error: "Paste a YouTube live or video URL." },
      { status: 400 },
    );
  }
  const title = stripEmDashes(String(body.title ?? "").trim());
  if (!title) {
    return NextResponse.json(
      { ok: false, error: "Name this clip." },
      { status: 400 },
    );
  }
  const startSec = parseClockToSeconds(String(body.start ?? "0"));
  const endSec = body.end?.trim()
    ? parseClockToSeconds(String(body.end))
    : null;
  if (startSec == null) {
    return NextResponse.json(
      { ok: false, error: "Start time looks off. Use 1:23 or seconds." },
      { status: 400 },
    );
  }
  if (endSec != null && endSec <= startSec) {
    return NextResponse.json(
      { ok: false, error: "End time has to be after the start." },
      { status: 400 },
    );
  }

  const watchUrl = youtubeWatchUrl(videoId, startSec);
  const gymName = stripEmDashes(String(body.gym_name ?? "").trim()) || null;
  const category = stripEmDashes(String(body.category ?? "training").trim()) || "training";
  const description = stripEmDashes(String(body.description ?? "").trim());
  const exerciseId = body.exercise_id?.trim() || null;

  const { data, error } = await supabase
    .from("videos")
    .insert({
      title,
      description,
      provider: "youtube",
      video_url: watchUrl,
      source_url: `https://www.youtube.com/watch?v=${videoId}`,
      start_sec: startSec,
      end_sec: endSec,
      category,
      gym_name: gymName,
      exercise_id: exerciseId,
      is_active: true,
      published_at: new Date().toISOString(),
      created_by: user.id,
    })
    .select("id, title, video_url, start_sec, end_sec")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Could not save the clip." },
      { status: 500 },
    );
  }

  if (body.attach_howto && exerciseId) {
    await supabase
      .from("exercises")
      .update({
        youtube_url: watchUrl,
        youtube_posted_at: new Date().toISOString(),
      })
      .eq("id", exerciseId);
  }

  return NextResponse.json({ ok: true, clip: data });
}
