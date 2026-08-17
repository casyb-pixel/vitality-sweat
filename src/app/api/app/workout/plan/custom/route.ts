import { NextResponse } from "next/server";
import { defaultDayDrafts } from "@/lib/fitness/custom-split";
import {
  archiveActivePrograms,
  fetchNestedProgramById,
} from "@/lib/fitness/program-query";
import {
  getFitnessProfile,
  isOnboardingComplete,
  trainingPreferencesFromProfile,
} from "@/lib/fitness/profile";
import type { PreferredSplit } from "@/lib/fitness/types";
import { PREFERRED_SPLIT_LABELS } from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

const SPLITS = new Set<string>(Object.keys(PREFERRED_SPLIT_LABELS));

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const profile = await getFitnessProfile(supabase, user.id);
    if (!isOnboardingComplete(profile) || !profile) {
      return NextResponse.json(
        { ok: false, error: "Complete onboarding before building a workout." },
        { status: 400 },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const daysPerWeek = Number(body.days_per_week ?? profile.days_per_week ?? 4);
    if (!Number.isInteger(daysPerWeek) || daysPerWeek < 1 || daysPerWeek > 7) {
      return NextResponse.json(
        { ok: false, error: "Days per week must be 1 to 7." },
        { status: 400 },
      );
    }

    const sessionMinutes = Number(
      body.session_minutes ?? profile.session_minutes ?? 45,
    );
    if (
      !Number.isInteger(sessionMinutes) ||
      sessionMinutes < 5 ||
      sessionMinutes > 180
    ) {
      return NextResponse.json(
        { ok: false, error: "Session minutes must be 5 to 180." },
        { status: 400 },
      );
    }

    const splitRaw =
      typeof body.preferred_split === "string" ? body.preferred_split : "custom";
    const preferredSplit = SPLITS.has(splitRaw)
      ? (splitRaw as PreferredSplit)
      : "custom";

    const overrideDays = Array.isArray(body.days)
      ? (body.days as Array<{ label?: string; focus?: string | null }>)
      : undefined;
    const drafts = defaultDayDrafts(daysPerWeek, preferredSplit, overrideDays);

    const archived = await archiveActivePrograms(supabase, user.id);
    if (!archived.ok) {
      return NextResponse.json({ ok: false, error: archived.error }, { status: 500 });
    }

    const prefs = trainingPreferencesFromProfile(profile);
    const summary =
      typeof body.summary === "string" && body.summary.trim()
        ? body.summary.trim()
        : `Your ${daysPerWeek}-day custom split. Add exercises to each day, then start when you are ready.`;

    const { data: program, error: programError } = await supabase
      .from("workout_programs")
      .insert({
        user_id: user.id,
        status: "active",
        origin: "custom",
        primary_goal: profile.primary_goal,
        days_per_week: daysPerWeek,
        session_minutes: sessionMinutes,
        summary,
        preferences: {
          days_per_week: daysPerWeek,
          session_minutes: sessionMinutes,
          equipment: prefs.equipment,
          focus_muscles: prefs.focus_muscles,
          avoidances: prefs.avoidances,
          preferred_split: preferredSplit,
        },
      })
      .select("*")
      .single();

    if (programError || !program) {
      return NextResponse.json(
        { ok: false, error: programError?.message ?? "Could not save program." },
        { status: 500 },
      );
    }

    for (const [index, day] of drafts.entries()) {
      const { error: dayError } = await supabase
        .from("workout_program_days")
        .insert({
          program_id: program.id,
          day_index: index,
          day_kind: "scheduled",
          source: "program",
          scheduled_date: null,
          label: day.label,
          focus: day.focus,
          estimated_minutes: sessionMinutes,
          notes: null,
        });
      if (dayError) {
        await supabase.from("workout_programs").delete().eq("id", program.id);
        return NextResponse.json(
          { ok: false, error: dayError.message },
          { status: 500 },
        );
      }
    }

    await supabase
      .from("fitness_profiles")
      .update({
        days_per_week: daysPerWeek,
        session_minutes: sessionMinutes,
        preferred_split: preferredSplit,
      })
      .eq("id", user.id);

    const nested = await fetchNestedProgramById(supabase, program.id);
    return NextResponse.json({ ok: true, program: nested ?? program });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
