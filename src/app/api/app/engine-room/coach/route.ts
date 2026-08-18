import { NextResponse } from "next/server";
import {
  createGeminiClient,
  formatGeminiError,
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/ai/gemini";
import {
  COACH_DAILY_LIMIT,
  COACH_HISTORY_LIMIT,
  buildEngineCoachPrompt,
  fallbackCoachReply,
  sanitizeCoachReply,
  type CoachMessage,
  type CoachSessionSummary,
} from "@/lib/engine-room/coach";
import { chicagoDateString } from "@/lib/engine-room/calendar";
import { loadGameSnapshot } from "@/lib/engine-room/snapshot";
import { PRIMARY_GOAL_LABELS } from "@/lib/fitness/types";
import { getFitnessProfile } from "@/lib/fitness/profile";
import { stripEmDashes } from "@/lib/text/humanize-copy";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 40;

async function member() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function coachAllowed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data } = await supabase
    .from("fitness_profiles")
    .select("session_coach_opt_in")
    .eq("id", userId)
    .maybeSingle();
  return data?.session_coach_opt_in !== false;
}

async function loadMessages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<CoachMessage[]> {
  const { data } = await supabase
    .from("engine_room_coach_messages")
    .select("id, role, body, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(80);
  return (data ?? []) as CoachMessage[];
}

function remainingToday(messages: CoachMessage[], now = new Date()): number {
  const today = chicagoDateString(now);
  const used = messages.filter(
    (row) =>
      row.role === "user" && chicagoDateString(new Date(row.created_at)) === today,
  ).length;
  return Math.max(0, COACH_DAILY_LIMIT - used);
}

async function loadRecentSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<CoachSessionSummary[]> {
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, started_at, status")
    .eq("user_id", userId)
    .in("status", ["completed", "active"])
    .order("started_at", { ascending: false })
    .limit(3);
  const rows = sessions ?? [];
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id as string);
  const [{ data: sets }, { data: posts }] = await Promise.all([
    supabase
      .from("workout_sets")
      .select("session_id, weight_lb, reps, exercise:exercises ( name )")
      .in("session_id", ids),
    supabase
      .from("engine_room_posts")
      .select("session_id")
      .eq("author_id", userId)
      .eq("kind", "session")
      .in("session_id", ids)
      .is("deleted_at", null),
  ]);
  const posted = new Set(
    (posts ?? [])
      .map((row) => row.session_id as string | null)
      .filter((id): id is string => Boolean(id)),
  );
  return rows.map((session) => {
    const lifts = (sets ?? [])
      .filter((set) => set.session_id === session.id)
      .map((set) => {
        const name =
          (set.exercise as { name?: string | null } | null)?.name ?? "Lift";
        const weight =
          set.weight_lb != null ? `${Number(set.weight_lb)} lb` : null;
        const reps = set.reps != null ? `${set.reps} reps` : null;
        return [name, weight, reps].filter(Boolean).join(" ");
      });
    return {
      startedAt: String(session.started_at),
      status: String(session.status),
      posted: posted.has(session.id as string),
      lifts: [...new Set(lifts)].slice(0, 8),
    };
  });
}

export async function GET() {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!(await coachAllowed(supabase, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Session coach is off in Settings." },
      { status: 403 },
    );
  }
  const messages = await loadMessages(supabase, user.id);
  return NextResponse.json({
    ok: true,
    messages,
    remaining: remainingToday(messages),
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await member();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!(await coachAllowed(supabase, user.id))) {
    return NextResponse.json(
      { ok: false, error: "Session coach is off in Settings." },
      { status: 403 },
    );
  }

  let payload: { message?: string } = {};
  try {
    payload = (await request.json()) as { message?: string };
  } catch {
    payload = {};
  }
  const message = stripEmDashes(String(payload.message ?? "").trim()).slice(0, 2000);
  if (!message) {
    return NextResponse.json(
      { ok: false, error: "Write something to the Engine." },
      { status: 400 },
    );
  }

  const existing = await loadMessages(supabase, user.id);
  if (remainingToday(existing) <= 0) {
    return NextResponse.json(
      { ok: false, error: "That is today's coach limit. Come back tomorrow." },
      { status: 429 },
    );
  }

  const { error: userInsertError } = await supabase
    .from("engine_room_coach_messages")
    .insert({
      user_id: user.id,
      role: "user",
      body: message,
    });
  if (userInsertError) {
    return NextResponse.json(
      { ok: false, error: userInsertError.message },
      { status: 500 },
    );
  }

  const [snapshot, recentSessions, profile, { data: account }] = await Promise.all([
    loadGameSnapshot(supabase, user.id),
    loadRecentSessions(supabase, user.id),
    getFitnessProfile(supabase, user.id),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const history = (await loadMessages(supabase, user.id)).slice(
    -COACH_HISTORY_LIMIT,
  );
  let reply = fallbackCoachReply(snapshot);
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const goal = profile?.primary_goal
        ? PRIMARY_GOAL_LABELS[profile.primary_goal]
        : null;
      const ai = createGeminiClient(apiKey);
      const contents = [
        {
          role: "user" as const,
          parts: [
            {
              text: buildEngineCoachPrompt({
                displayName: account?.display_name ?? null,
                goal,
                snapshot,
                recentSessions,
              }),
            },
          ],
        },
        {
          role: "model" as const,
          parts: [{ text: "Got it. I have the snapshot." }],
        },
        ...history.map((row) => ({
          role: (row.role === "assistant" ? "model" : "user") as "model" | "user",
          parts: [{ text: row.body }],
        })),
      ];
      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents,
      });
      const text = sanitizeCoachReply(response.text ?? "");
      if (text) reply = text;
    } catch (error) {
      console.error("[engine-room/coach]", formatGeminiError(error));
    }
  }

  const { error: assistantError } = await supabase
    .from("engine_room_coach_messages")
    .insert({
      user_id: user.id,
      role: "assistant",
      body: reply,
    });
  if (assistantError) {
    return NextResponse.json(
      { ok: false, error: assistantError.message },
      { status: 500 },
    );
  }

  const messages = await loadMessages(supabase, user.id);
  return NextResponse.json({
    ok: true,
    messages,
    remaining: remainingToday(messages),
  });
}
