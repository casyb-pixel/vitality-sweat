import type { SupabaseClient } from "@supabase/supabase-js";
import { parseAnswers } from "./answers";
import { chicagoDate, daysUntilDeadline } from "./dates";
import { matchScholarship } from "./match";
import type { MatchLevel, ScholarshipAnswers, ScholarshipCriteria } from "./types";

export type DeskScholarship = {
  id: string;
  slug: string;
  name: string;
  sponsor: string;
  url: string | null;
  amount: string | null;
  deadline: string | null;
  deadlineNote: string | null;
  notes: string | null;
  applied: boolean;
  status: string;
  match: MatchLevel;
  reason: string;
  daysUntil: number | null;
};

export type ScholarshipDesk = {
  answers: ScholarshipAnswers;
  confirmed: boolean;
  scholarships: DeskScholarship[];
  warnings: DeskScholarship[];
};

function asCriteria(value: unknown): ScholarshipCriteria {
  if (!value || typeof value !== "object") return {};
  return value as ScholarshipCriteria;
}

export async function loadScholarshipDesk(
  supabase: SupabaseClient,
): Promise<ScholarshipDesk> {
  const today = chicagoDate();
  const [{ data: profile, error: profileError }, { data: rows, error: listError }] =
    await Promise.all([
      supabase.from("scholarship_profiles").select("answers, confirmed_at").eq("id", 1).maybeSingle(),
      supabase
        .from("scholarships")
        .select(
          "id, slug, name, sponsor, url, amount, deadline, deadline_note, notes, criteria, sort_order, scholarship_applications(applied, status)",
        )
        .order("sort_order", { ascending: true }),
    ]);

  if (profileError) throw new Error(profileError.message);
  if (listError) throw new Error(listError.message);

  const answers = parseAnswers(profile?.answers);
  const scholarships: DeskScholarship[] = (rows ?? []).map((row) => {
    const application = Array.isArray(row.scholarship_applications)
      ? row.scholarship_applications[0]
      : row.scholarship_applications;
    const deadline = typeof row.deadline === "string" ? row.deadline.slice(0, 10) : null;
    const result = matchScholarship(answers, asCriteria(row.criteria));
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      sponsor: row.sponsor as string,
      url: (row.url as string | null) ?? null,
      amount: (row.amount as string | null) ?? null,
      deadline,
      deadlineNote: (row.deadline_note as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
      applied: Boolean(application?.applied),
      status: (application?.status as string | undefined) ?? "not_started",
      match: result.match,
      reason: result.reason,
      daysUntil: deadline ? daysUntilDeadline(deadline, today) : null,
    };
  });

  const warnings = scholarships
    .filter((item) => !item.applied && item.daysUntil != null && item.daysUntil <= 14)
    .sort((a, b) => (a.daysUntil ?? 0) - (b.daysUntil ?? 0));

  return {
    answers,
    confirmed: Boolean(profile?.confirmed_at),
    scholarships,
    warnings,
  };
}
