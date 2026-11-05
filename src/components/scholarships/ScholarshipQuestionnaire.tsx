"use client";

import { useState } from "react";
import { saveScholarshipProfile } from "@/lib/scholarships/actions";
import type { ScholarshipAnswers } from "@/lib/scholarships/types";

const STEPS = ["Student", "Scores", "College", "Family", "Activities"] as const;

const fieldClass =
  "w-full border border-brand-ink/15 bg-surface px-3 py-2.5 font-sans text-sm text-brand-ink";

function num(value: number | null): string {
  return value == null ? "" : String(value);
}

function yn(value: boolean | null): string {
  if (value == null) return "";
  return value ? "yes" : "no";
}

export default function ScholarshipQuestionnaire({
  answers,
  onDone,
}: {
  answers: ScholarshipAnswers;
  onDone: () => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(answers);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function set<K extends keyof ScholarshipAnswers>(key: K, value: ScholarshipAnswers[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save(confirm: boolean) {
    setPending(true);
    setError(null);
    const form = new FormData();
    const entries: Record<string, string> = {
      studentFirstName: draft.studentFirstName,
      studentLastName: draft.studentLastName,
      studentEmail: draft.studentEmail,
      phone: draft.phone,
      city: draft.city,
      state: draft.state,
      zip: draft.zip,
      parish: draft.parish,
      highSchool: draft.highSchool,
      graduationYear: draft.graduationYear,
      gpaUnweighted: num(draft.gpaUnweighted),
      classRank: draft.classRank,
      actComposite: num(draft.actComposite),
      actEnglish: num(draft.actEnglish),
      actMath: num(draft.actMath),
      actReading: num(draft.actReading),
      actScience: num(draft.actScience),
      citizenship: draft.citizenship,
      college: draft.college,
      startTerm: draft.startTerm,
      major: draft.major,
      minor: draft.minor,
      housingPlan: draft.housingPlan,
      parent1Name: draft.parent1Name,
      parent1Employer: draft.parent1Employer,
      parent1College: draft.parent1College,
      parent1Degree: draft.parent1Degree,
      parent1GradYear: draft.parent1GradYear,
      parent2Name: draft.parent2Name,
      parent2Employer: draft.parent2Employer,
      parent2College: draft.parent2College,
      parent2Degree: draft.parent2Degree,
      parent2GradYear: draft.parent2GradYear,
      beciMember: yn(draft.beciMember),
      swlacuMember: yn(draft.swlacuMember),
      householdIncome: num(draft.householdIncome),
      othersInCollege: draft.othersInCollege,
      fsaIdsCreated: yn(draft.fsaIdsCreated),
      fafsaFiled: yn(draft.fafsaFiled),
      activities: draft.activities,
      confirm: confirm ? "yes" : "no",
    };
    for (const [key, value] of Object.entries(entries)) form.set(key, value);
    if (draft.hasTranscript) form.set("hasTranscript", "on");
    if (draft.hasScoreReport) form.set("hasScoreReport", "on");
    if (draft.hasRecommendations) form.set("hasRecommendations", "on");

    const result = await saveScholarshipProfile(form);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (confirm) onDone();
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-6 py-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (step < STEPS.length - 1) setStep((current) => current + 1);
        else void save(true);
      }}
    >
      <header>
        <p className="eyebrow text-brand-orange">Private</p>
        <h1 className="font-display text-4xl text-brand-ink">Scholarship answers</h1>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brand-muted">
          These answers stay in this household desk. They are here so the list
          can show what Hunter may qualify for. This page does not write essays.
          Leave Social Security numbers and tax forms off this form.
        </p>
      </header>

      <ol className="flex flex-wrap gap-2">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(index)}
              className={`border px-3 py-1.5 font-sans text-xs font-bold uppercase tracking-[0.08em] ${
                index === step
                  ? "border-brand-orange bg-brand-orange text-white"
                  : "border-brand-ink/15 text-brand-muted"
              }`}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <input className={fieldClass} placeholder="First name" value={draft.studentFirstName} onChange={(e) => set("studentFirstName", e.target.value)} required />
          <input className={fieldClass} placeholder="Last name" value={draft.studentLastName} onChange={(e) => set("studentLastName", e.target.value)} required />
          <input className={fieldClass} type="email" placeholder="Email" value={draft.studentEmail} onChange={(e) => set("studentEmail", e.target.value)} />
          <input className={fieldClass} placeholder="Phone" value={draft.phone} onChange={(e) => set("phone", e.target.value)} />
          <input className={fieldClass} placeholder="City" value={draft.city} onChange={(e) => set("city", e.target.value)} />
          <input className={fieldClass} placeholder="ZIP" value={draft.zip} onChange={(e) => set("zip", e.target.value)} />
          <input className={fieldClass} placeholder="Parish" value={draft.parish} onChange={(e) => set("parish", e.target.value)} />
          <input className={fieldClass} placeholder="State" value={draft.state} onChange={(e) => set("state", e.target.value)} />
          <input className={`${fieldClass} sm:col-span-2`} placeholder="Citizenship" value={draft.citizenship} onChange={(e) => set("citizenship", e.target.value)} />
        </section>
      ) : null}

      {step === 1 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <input className={`${fieldClass} sm:col-span-2`} placeholder="High school" value={draft.highSchool} onChange={(e) => set("highSchool", e.target.value)} />
          <input className={fieldClass} placeholder="Graduation year" value={draft.graduationYear} onChange={(e) => set("graduationYear", e.target.value)} />
          <input className={fieldClass} placeholder="Class rank" value={draft.classRank} onChange={(e) => set("classRank", e.target.value)} />
          <input className={fieldClass} inputMode="decimal" placeholder="Unweighted GPA" value={num(draft.gpaUnweighted)} onChange={(e) => set("gpaUnweighted", e.target.value ? Number(e.target.value) : null)} required />
          <input className={fieldClass} inputMode="numeric" placeholder="ACT composite" value={num(draft.actComposite)} onChange={(e) => set("actComposite", e.target.value ? Number(e.target.value) : null)} required />
          <input className={fieldClass} inputMode="numeric" placeholder="ACT English" value={num(draft.actEnglish)} onChange={(e) => set("actEnglish", e.target.value ? Number(e.target.value) : null)} />
          <input className={fieldClass} inputMode="numeric" placeholder="ACT Math" value={num(draft.actMath)} onChange={(e) => set("actMath", e.target.value ? Number(e.target.value) : null)} />
          <input className={fieldClass} inputMode="numeric" placeholder="ACT Reading" value={num(draft.actReading)} onChange={(e) => set("actReading", e.target.value ? Number(e.target.value) : null)} />
          <input className={fieldClass} inputMode="numeric" placeholder="ACT Science" value={num(draft.actScience)} onChange={(e) => set("actScience", e.target.value ? Number(e.target.value) : null)} />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="grid gap-3">
          <input className={fieldClass} placeholder="College" value={draft.college} onChange={(e) => set("college", e.target.value)} />
          <input className={fieldClass} placeholder="Start term" value={draft.startTerm} onChange={(e) => set("startTerm", e.target.value)} />
          <input className={fieldClass} placeholder="Major" value={draft.major} onChange={(e) => set("major", e.target.value)} />
          <input className={fieldClass} placeholder="Minor" value={draft.minor} onChange={(e) => set("minor", e.target.value)} />
          <input className={fieldClass} placeholder="Housing plan" value={draft.housingPlan} onChange={(e) => set("housingPlan", e.target.value)} />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          <input className={fieldClass} placeholder="Parent 1 name" value={draft.parent1Name} onChange={(e) => set("parent1Name", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 1 employer" value={draft.parent1Employer} onChange={(e) => set("parent1Employer", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 1 college" value={draft.parent1College} onChange={(e) => set("parent1College", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 1 degree" value={draft.parent1Degree} onChange={(e) => set("parent1Degree", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 1 graduation year" value={draft.parent1GradYear} onChange={(e) => set("parent1GradYear", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 2 name" value={draft.parent2Name} onChange={(e) => set("parent2Name", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 2 employer" value={draft.parent2Employer} onChange={(e) => set("parent2Employer", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 2 college" value={draft.parent2College} onChange={(e) => set("parent2College", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 2 degree" value={draft.parent2Degree} onChange={(e) => set("parent2Degree", e.target.value)} />
          <input className={fieldClass} placeholder="Parent 2 graduation year" value={draft.parent2GradYear} onChange={(e) => set("parent2GradYear", e.target.value)} />
          <label className="font-sans text-sm text-brand-ink">
            Beauregard Electric member
            <select className={`${fieldClass} mt-1`} value={yn(draft.beciMember)} onChange={(e) => set("beciMember", e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}>
              <option value="">Not answered</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="font-sans text-sm text-brand-ink">
            SWLA Credit Union member account
            <select className={`${fieldClass} mt-1`} value={yn(draft.swlacuMember)} onChange={(e) => set("swlacuMember", e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}>
              <option value="">Not answered</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <input className={fieldClass} inputMode="numeric" placeholder="Household income" value={num(draft.householdIncome)} onChange={(e) => set("householdIncome", e.target.value ? Number(e.target.value) : null)} />
          <input className={fieldClass} placeholder="Others in college" value={draft.othersInCollege} onChange={(e) => set("othersInCollege", e.target.value)} />
          <label className="font-sans text-sm text-brand-ink">
            FSA IDs created
            <select className={`${fieldClass} mt-1`} value={yn(draft.fsaIdsCreated)} onChange={(e) => set("fsaIdsCreated", e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}>
              <option value="">Not answered</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
          <label className="font-sans text-sm text-brand-ink">
            FAFSA filed
            <select className={`${fieldClass} mt-1`} value={yn(draft.fafsaFiled)} onChange={(e) => set("fafsaFiled", e.target.value === "yes" ? true : e.target.value === "no" ? false : null)}>
              <option value="">Not answered</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </label>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-3">
          <textarea className={`${fieldClass} min-h-28`} placeholder="Sports, clubs, jobs, service" value={draft.activities} onChange={(e) => set("activities", e.target.value)} />
          <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
            <input type="checkbox" checked={draft.hasTranscript} onChange={(e) => set("hasTranscript", e.target.checked)} />
            Transcript is ready
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
            <input type="checkbox" checked={draft.hasScoreReport} onChange={(e) => set("hasScoreReport", e.target.checked)} />
            ACT score report is ready
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
            <input type="checkbox" checked={draft.hasRecommendations} onChange={(e) => set("hasRecommendations", e.target.checked)} />
            Recommendation writers are lined up
          </label>
        </section>
      ) : null}

      {error ? <p className="font-sans text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        {step > 0 ? (
          <button type="button" className="border border-brand-ink/20 px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em]" onClick={() => setStep((current) => current - 1)}>
            Back
          </button>
        ) : null}
        <button type="submit" disabled={pending} className="bg-brand-orange px-4 py-2.5 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60">
          {pending ? "Saving" : step === STEPS.length - 1 ? "Save and open the list" : "Next"}
        </button>
      </div>
    </form>
  );
}
