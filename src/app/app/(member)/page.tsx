import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
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
    title: "Today’s workout",
    body: "Start a session, log sets, and get progressive overload suggestions.",
  },
  {
    href: "/app/nutrition",
    title: "Meal planning",
    body: "Gemini builds a weekly plan, grocery list, and healthy snack ideas.",
  },
  {
    href: "/app/library",
    title: "Video & Chronicles",
    body: "Watch instructional videos and read Hunter’s Sweatlife Chronicles.",
  },
] as const;

export default async function MemberDashboardPage() {
  const { user } = await requireMemberAccess("/app");
  const supabase = await createClient();
  const profile = await getFitnessProfile(supabase, user.id);

  if (!isOnboardingComplete(profile)) {
    redirect("/app/onboarding");
  }

  const age = profile?.birthdate ? ageFromBirthdate(profile.birthdate) : null;
  const level = profile?.fitness_level
    ? FITNESS_LEVEL_LABELS[profile.fitness_level]
    : "—";
  const goal = profile?.primary_goal
    ? PRIMARY_GOAL_LABELS[profile.primary_goal]
    : "—";

  return (
    <div className="space-y-8">
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
          . Your discovery profile is locked in — train, fuel, and learn from
          here.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Age" value={age != null ? String(age) : "—"} />
        <StatCard
          label="Weight"
          value={
            profile?.weight_lb != null ? `${profile.weight_lb} lb` : "—"
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
