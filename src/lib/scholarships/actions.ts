"use server";

import { revalidatePath } from "next/cache";
import { requireScholarshipAccess } from "@/lib/auth/scholarship";
import { createClient } from "@/utils/supabase/server";
import { answersFromForm } from "./answers";

const PATH = "/app/scholarships";

async function memberClient() {
  const { user } = await requireScholarshipAccess();
  const supabase = await createClient();
  return { user, supabase };
}

export async function saveScholarshipProfile(formData: FormData) {
  const { user, supabase } = await memberClient();
  const answers = answersFromForm(formData);
  const confirm = formData.get("confirm") === "yes";

  if (!answers.studentFirstName || !answers.studentLastName) {
    return { ok: false as const, error: "Add Hunter's first and last name." };
  }
  if (answers.gpaUnweighted == null || answers.actComposite == null) {
    return { ok: false as const, error: "GPA and ACT composite are required." };
  }

  const { error } = await supabase.from("scholarship_profiles").upsert({
    id: 1,
    answers,
    confirmed_at: confirm ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(PATH);
  return { ok: true as const };
}

export async function setScholarshipApplied(scholarshipId: string, applied: boolean) {
  const { user, supabase } = await memberClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("scholarship_applications").upsert({
    scholarship_id: scholarshipId,
    applied,
    applied_on: applied ? today : null,
    status: applied ? "applied" : "not_started",
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(PATH);
  return { ok: true as const };
}

export async function addLocalScholarship(formData: FormData) {
  const { supabase } = await memberClient();
  const name = String(formData.get("name") ?? "").trim();
  const sponsor = String(formData.get("sponsor") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const amount = String(formData.get("amount") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !sponsor) {
    return { ok: false as const, error: "Name and sponsor are required." };
  }
  if (url && !/^https:\/\//i.test(url)) {
    return { ok: false as const, error: "Link must start with https://." };
  }

  const { data, error } = await supabase
    .from("scholarships")
    .insert({
      slug: `local-${crypto.randomUUID()}`,
      name,
      sponsor,
      url: url || null,
      amount: amount || null,
      deadline: deadline || null,
      notes: notes || null,
      criteria: { likelyReason: "Added from the counseling list or a local award." },
      sort_order: 200,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "Could not add it." };

  await supabase.from("scholarship_applications").insert({
    scholarship_id: data.id,
    applied: false,
    status: "not_started",
  });

  revalidatePath(PATH);
  return { ok: true as const };
}
