import { NextResponse } from "next/server";
import {
  pairJoinUrl,
  randomInviteToken,
  syntheticDayFromSnapshot,
  type PairedDaySnapshot,
} from "@/lib/fitness/workout-pairing";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

async function member() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function POST(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let body: { program_day_id?: unknown; session_id?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const programDayId =
    typeof body.program_day_id === "string" ? body.program_day_id : null;
  const sessionId =
    typeof body.session_id === "string" ? body.session_id : null;
  if (!programDayId) {
    return NextResponse.json(
      { ok: false, error: "program_day_id required." },
      { status: 400 },
    );
  }

  const { data: day, error: dayError } = await supabase
    .from("workout_program_days")
    .select(
      `
      id, program_id, label, focus, notes, estimated_minutes, day_index,
      day_kind, scheduled_date, source, customized_at, created_at, updated_at,
      exercises:workout_program_exercises (
        id, day_id, exercise_id, sort_order, sets, rep_min, rep_max,
        set_style, rest_sec, coach_notes, baseline_weight_lb, baseline_reps,
        superset_group, created_at,
        exercise:exercises (id, name, category, primary_muscle, equipment)
      )
    `,
    )
    .eq("id", programDayId)
    .maybeSingle();

  if (dayError || !day) {
    return NextResponse.json(
      { ok: false, error: "Program day not found." },
      { status: 404 },
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, display_name")
    .eq("id", user.id)
    .maybeSingle();

  const rawExercises = Array.isArray(
    (day as { exercises?: unknown }).exercises,
  )
    ? ((day as { exercises: Record<string, unknown>[] }).exercises)
    : [];
  const snapshot: PairedDaySnapshot = {
    label: String((day as { label?: string }).label ?? "Workout"),
    focus: ((day as { focus?: string | null }).focus as string | null) ?? null,
    notes: ((day as { notes?: string | null }).notes as string | null) ?? null,
    estimated_minutes:
      ((day as { estimated_minutes?: number | null }).estimated_minutes as
        | number
        | null) ?? null,
    exercises: rawExercises.map((row, index) => {
      const ex = row.exercise as
        | { id?: string; name?: string }
        | { id?: string; name?: string }[]
        | null;
      const nested = Array.isArray(ex) ? ex[0] : ex;
      return {
        id: String(row.id ?? `ex-${index}`),
        exercise_id: String(row.exercise_id ?? nested?.id ?? ""),
        name: String(nested?.name ?? "Exercise"),
        sort_order: Number(row.sort_order ?? index),
        sets: Number(row.sets ?? 3),
        rep_min: (row.rep_min as number | null) ?? null,
        rep_max: (row.rep_max as number | null) ?? null,
        set_style: String(row.set_style ?? "hypertrophy"),
        rest_sec: (row.rest_sec as number | null) ?? null,
        coach_notes: (row.coach_notes as string | null) ?? null,
        superset_group: (row.superset_group as string | null) ?? null,
      };
    }),
  };
  const token = randomInviteToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: invite, error } = await supabase
    .from("workout_session_invites")
    .insert({
      token,
      host_user_id: user.id,
      host_session_id: sessionId,
      host_program_day_id: programDayId,
      host_referral_code:
        typeof profile?.referral_code === "string"
          ? profile.referral_code
          : null,
      day_snapshot: snapshot,
      expires_at: expiresAt,
    })
    .select("id, token, expires_at")
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Could not create invite." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    token: invite.token,
    joinUrl: pairJoinUrl(invite.token as string),
    expiresAt: invite.expires_at,
    hostName:
      typeof profile?.display_name === "string" ? profile.display_name : null,
    snapshot,
  });
}

export async function GET(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  const inviteId = new URL(request.url).searchParams.get("invite_id")?.trim() ?? "";
  if (!token && !inviteId) {
    return NextResponse.json({ ok: false, error: "token required." }, { status: 400 });
  }

  let query = supabase
    .from("workout_session_invites")
    .select(
      "id, token, host_user_id, host_referral_code, day_snapshot, expires_at",
    );
  if (token) query = query.eq("token", token);
  else query = query.eq("id", inviteId);

  const { data: invite } = await query.maybeSingle();

  if (!invite || new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "Invite expired or not found." },
      { status: 404 },
    );
  }

  const { data: host } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", invite.host_user_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    invite: {
      id: invite.id,
      hostUserId: invite.host_user_id,
      hostName: host?.display_name ?? host?.username ?? "Teammate",
      hostUsername: host?.username ?? null,
      hostReferralCode: invite.host_referral_code,
      snapshot: invite.day_snapshot as PairedDaySnapshot,
      expiresAt: invite.expires_at,
      isHost: invite.host_user_id === user.id,
    },
  });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  let body: { token?: unknown; replace?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "token required." }, { status: 400 });
  }

  const { data: invite } = await supabase
    .from("workout_session_invites")
    .select("id, host_user_id, day_snapshot, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite || new Date(invite.expires_at as string).getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "Invite expired or not found." },
      { status: 404 },
    );
  }
  if (invite.host_user_id === user.id) {
    return NextResponse.json(
      { ok: false, error: "That is your own invite." },
      { status: 400 },
    );
  }

  const { data: existing } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing && existing.paired_invite_id === invite.id) {
    const snapshot = invite.day_snapshot as PairedDaySnapshot;
    return NextResponse.json({
      ok: true,
      session: existing,
      day: syntheticDayFromSnapshot(invite.id as string, snapshot),
      resumed: true,
    });
  }

  if (existing && body.replace !== true) {
    return NextResponse.json({
      ok: false,
      error: "You already have an active session.",
      needs_replace: true,
    }, { status: 409 });
  }

  if (existing && body.replace === true) {
    await supabase
      .from("workout_sessions")
      .update({
        status: "cancelled",
        ended_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", user.id);
  }

  const { data: session, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      status: "active",
      program_day_id: null,
      session_source: "paired",
      paired_invite_id: invite.id,
    })
    .select("*")
    .single();

  if (error || !session) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Could not start paired session." },
      { status: 500 },
    );
  }

  const snapshot = invite.day_snapshot as PairedDaySnapshot;
  return NextResponse.json({
    ok: true,
    session,
    day: syntheticDayFromSnapshot(invite.id as string, snapshot),
    resumed: false,
  });
}
