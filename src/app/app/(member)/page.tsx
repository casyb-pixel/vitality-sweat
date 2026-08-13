import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import SweatScoreCard from "@/components/app/SweatScoreCard";
import { getMemberCompletionRedirect } from "@/lib/auth/member-profile";
import { requireMemberAccess } from "@/lib/auth/member";
import {
  ageFromBirthdate,
  getFitnessProfile,
  isOnboardingComplete,
} from "@/lib/fitness/profile";
import {
  FITNESS_LEVEL_LABELS,
  PRIMARY_GOAL_LABELS,
} from "@/lib/fitness/types";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Vitality Engine",
  robots: { index: false, follow: false },
};

const QUICK_LINKS = [
  {
    href: "/app/workout",
    title: "Today's workout",
    body: "Start a session, log sets, and get progressive overload suggestions.",
  },
  {
    href: "/app/history",
    title: "History",
    body: "Open past sessions, fix a bad set, and keep notes.",
  },
  {
    href: "/app/progress",
    title: "Progress",
    body: "Best set, volume, and estimated 1RM charts.",
  },
  {
    href: "/app/nutrition",
    title: "Meal planning",
    body: "Gemini builds a weekly plan, grocery list, and healthy snack ideas.",
  },
  {
    href: "/app/library",
    title: "Library",
    body: "Browse & search Chronicles, watch training clips, and open the YouTube channel mid-workout.",
  },
] as const;

type PlanDayRow = {
  id: string;
  label: string;
  focus: string | null;
  day_index: number | null;
  day_kind: string | null;
  scheduled_date: string | null;
  customized_at: string | null;
};

function startOfLocalWeekISO(d = new Date()): string {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function MemberDashboardPage() {
  const { user } = await requireMemberAccess("/app");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);
  const completion = await getMemberCompletionRedirect(supabase, user.id, {
    fitnessOnboardingComplete: isOnboardingComplete(profile),
  });
  if (completion) {
    redirect(completion);
  }

  const age = profile?.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile?.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "-";
  const goal = profile?.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "-";

  const { data: activeProgram } = await supabase
    .from("workout_programs")
    .select(
      `
      id, status, days_per_week, primary_goal, summary,
      days:workout_program_days (
        id, label, focus, day_index, day_kind, scheduled_date, customized_at
      )
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const days = ((activeProgram?.days ?? []) as PlanDayRow[]).slice();
  const scheduled = days
    .filter((d) => d.day_kind !== "bonus" && d.day_index != null)
    .sort((a, b) => (a.day_index ?? 0) - (b.day_index ?? 0));
  const weekStart = startOfLocalWeekISO();
  const today = todayISO();
  const extrasThisWeek = days.filter((d) => {
    if (d.day_kind !== "bonus") return false;
    if (!d.scheduled_date) return false;
    return d.scheduled_date >= weekStart && d.scheduled_date <= today;
  });
  const nextDay =
    scheduled.length === 0
      ? null
      : scheduled[new Date().getDay() % scheduled.length] ?? scheduled[0] ?? null;
  const hasCustom = scheduled.some((d) => Boolean(d.customized_at));

  return (
    <div className="space-y-8">
      <AdSlot slotId="app-home" label="Local partner" size="banner" />
      <header className="space-y-3">
        <p className="eyebrow text-brand-orange">Vitality Engine</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          Ready to sweat?
        </h1>
        <p className="max-w-2xl font-sans text-sm leading-relaxed text-brand-muted sm:text-base">
          Signed in as{" "}
          <span className="font-semibold text-brand-ink">
            {user.email ?? user.id}
          </span>
          . Your discovery profile is locked in. Train, fuel, and learn from
          here.
        </p>
      </header>

      <SweatScoreCard />

      <section className="border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-brand-orange">Your plan</p>
            <h2 className="font-display text-2xl text-brand-ink">
              {activeProgram
                ? `${activeProgram.days_per_week ?? scheduled.length}-day program`
                : "No active plan yet"}
            </h2>
          </div>
          <Link
            href="/app/workout"
            className="inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
          >
            {activeProgram ? "Open workout" : "Build a plan"}
          </Link>
        </div>

        {!activeProgram ? (
          <p className="mt-3 font-sans text-sm text-brand-muted">
            Use the Workout Agent to generate a mapped weekly plan.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
                Status
              </p>
              <p className="mt-1 font-sans text-sm text-brand-ink">
                Active
                {hasCustom ? " · customized" : " · AI draft"}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
                Next scheduled day
              </p>
              <p className="mt-1 font-sans text-sm text-brand-ink">
                {nextDay
                  ? `${nextDay.label}${nextDay.focus ? ` · ${nextDay.focus}` : ""}`
                  : "No scheduled days"}
              </p>
            </div>
            <div>
              <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
                Extras this week
              </p>
              <p className="mt-1 font-sans text-sm text-brand-ink">
                {extrasThisWeek.length === 0
                  ? "None yet"
                  : `${extrasThisWeek.length} bonus session${extrasThisWeek.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        )}

        {activeProgram ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/workout"
              className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
            >
              Customize plan
            </Link>
            {nextDay ? (
              <Link
                href="/app/workout#log-workout"
                className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
              >
                Start next day
              </Link>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Age" value={age != null ? String(age) : "-"} />
        <StatCard
          label="Weight"
          value={
            profile?.weight_lb != null ? `${profile.weight_lb} lb` : "-"
          }
        />
        <StatCard label="Level" value={level} />
        <StatCard label="Goal" value={goal} />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group border border-brand-ink/10 bg-surface-elevated p-5 transition-colors hover:border-brand-orange"
          >
            <h2 className="font-display text-xl text-brand-ink group-hover:text-brand-orange">
              {link.title}
            </h2>
            <p className="mt-2 font-sans text-sm leading-relaxed text-brand-muted">
              {link.body}
            </p>
          </Link>
        ))}
      </section>

      <p className="font-sans text-sm text-brand-muted">
        Need to update discovery answers?{" "}
        <Link
          href="/app/onboarding"
          className="font-semibold text-brand-orange hover:text-brand-orange-deep"
        >
          Edit your profile
        </Link>
        .
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-brand-ink/10 bg-surface-elevated p-4">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl text-brand-ink">{value}</p>
    </div>
  );
}
