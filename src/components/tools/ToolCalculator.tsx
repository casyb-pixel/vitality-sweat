"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import SignupCtaLink from "@/components/marketing/SignupCtaLink";
import { estimatedOneRepMaxLb } from "@/lib/fitness/one-rep-max";
import { platesForTarget } from "@/lib/fitness/plates";
import {
  ACTIVITY_LABELS,
  type ActivityLevel,
  bmiFromMetric,
  creatineDoseG,
  heartRateZones,
  inchesToCm,
  lbToKg,
  macrosFromCalories,
  mifflinBmrKcal,
  runningPaceFromDistance,
  targetCalories,
  tdeeKcal,
} from "@/lib/tools/math";
import type { ToolSlug } from "@/lib/tools/catalog";

const field =
  "mt-1.5 w-full border border-brand-ink/15 bg-white px-3 py-2.5 font-sans text-sm";
const label = "block font-sans text-sm font-semibold text-brand-ink";

export default function ToolCalculator({ slug }: { slug: ToolSlug }) {
  if (slug === "one-rep-max") return <OneRm />;
  if (slug === "plate-calculator") return <Plates />;
  if (slug === "heart-rate-zones") return <HrZones />;
  if (slug === "running-pace") return <Pace />;
  if (slug === "creatine-dose") return <Creatine />;
  return <BodyTool slug={slug} />;
}

function BodyTool({ slug }: { slug: "tdee" | "macros" | "bmi" }) {
  const [sex, setSex] = useState<"male" | "female">("male");
  const [age, setAge] = useState("18");
  const [heightIn, setHeightIn] = useState("70");
  const [weightLb, setWeightLb] = useState("170");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [goal, setGoal] = useState<"lose" | "maintain" | "gain">("maintain");

  const result = useMemo(() => {
    const ageN = Number(age);
    const kg = lbToKg(Number(weightLb));
    const cm = inchesToCm(Number(heightIn));
    if (![ageN, kg, cm].every((n) => Number.isFinite(n) && n > 0)) return null;
    const bmr = mifflinBmrKcal({ sex, weightKg: kg, heightCm: cm, age: ageN });
    const tdee = tdeeKcal(bmr, activity);
    const calories = targetCalories(tdee, goal);
    const macros = macrosFromCalories({ calories, weightKg: kg, goal });
    const bmi = bmiFromMetric(kg, cm);
    return { bmr, tdee, calories, macros, bmi };
  }, [sex, age, heightIn, weightLb, activity, goal]);

  return (
    <div className="space-y-4">
      <SexAgeHeightWeight
        sex={sex}
        setSex={setSex}
        age={age}
        setAge={setAge}
        heightIn={heightIn}
        setHeightIn={setHeightIn}
        weightLb={weightLb}
        setWeightLb={setWeightLb}
      />
      {slug !== "bmi" ? (
        <>
          <label className={label}>
            Activity
            <select
              className={field}
              value={activity}
              onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            >
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((k) => (
                <option key={k} value={k}>
                  {ACTIVITY_LABELS[k]}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            Goal
            <select
              className={field}
              value={goal}
              onChange={(e) =>
                setGoal(e.target.value as "lose" | "maintain" | "gain")
              }
            >
              <option value="lose">Lose (small deficit)</option>
              <option value="maintain">Maintain</option>
              <option value="gain">Gain (small surplus)</option>
            </select>
          </label>
        </>
      ) : null}
      {result ? (
        <div className="border border-brand-ink/10 bg-white p-4">
          {slug === "bmi" ? (
            <>
              <p className="font-display text-3xl text-brand-ink">{result.bmi}</p>
              <p className="mt-2 font-sans text-sm text-brand-muted">
                BMI is a screen, not a grade. Lifters and athletes often sit
                higher because of muscle.
              </p>
            </>
          ) : slug === "tdee" ? (
            <>
              <p className="font-sans text-xs uppercase tracking-[0.1em] text-brand-muted">
                Estimated TDEE
              </p>
              <p className="font-display text-3xl text-brand-ink">
                {result.tdee} kcal
              </p>
              <p className="mt-2 font-sans text-sm text-brand-muted">
                BMR {result.bmr}. Target for your goal: {result.calories} kcal.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-3xl text-brand-ink">
                {result.calories} kcal
              </p>
              <p className="mt-2 font-sans text-sm text-brand-ink">
                Protein {result.macros.proteinG}g · Carbs {result.macros.carbsG}g
                · Fat {result.macros.fatG}g
              </p>
            </>
          )}
          <SaveCta />
        </div>
      ) : null}
    </div>
  );
}

function OneRm() {
  const [weight, setWeight] = useState("185");
  const [reps, setReps] = useState("5");
  const est = estimatedOneRepMaxLb(Number(weight), Number(reps));
  return (
    <div className="space-y-4">
      <label className={label}>
        Weight (lb)
        <input className={field} value={weight} onChange={(e) => setWeight(e.target.value)} />
      </label>
      <label className={label}>
        Reps (1-12)
        <input className={field} value={reps} onChange={(e) => setReps(e.target.value)} />
      </label>
      <div className="border border-brand-ink/10 bg-white p-4">
        <p className="font-display text-3xl text-brand-ink">
          {est != null ? `${est} lb` : "Use 1-12 clean reps"}
        </p>
        <SaveCta />
      </div>
    </div>
  );
}

function Plates() {
  const [target, setTarget] = useState("225");
  const plan = platesForTarget({ targetLb: Number(target) || 45 });
  return (
    <div className="space-y-4">
      <label className={label}>
        Target (lb)
        <input className={field} value={target} onChange={(e) => setTarget(e.target.value)} />
      </label>
      <div className="border border-brand-ink/10 bg-white p-4">
        <ul className="space-y-1 font-sans text-sm">
          {plan.perSide.map((row) => (
            <li key={row.plate}>
              {row.count} × {row.plate} lb each side
            </li>
          ))}
        </ul>
        <SaveCta />
      </div>
    </div>
  );
}

function HrZones() {
  const [age, setAge] = useState("18");
  const zones = Number(age) > 0 ? heartRateZones(Number(age)) : null;
  return (
    <div className="space-y-4">
      <label className={label}>
        Age
        <input className={field} value={age} onChange={(e) => setAge(e.target.value)} />
      </label>
      {zones ? (
        <div className="border border-brand-ink/10 bg-white p-4 font-sans text-sm">
          <p>Estimated max {zones.max} bpm</p>
          <p>Easy {zones.easy[0]}-{zones.easy[1]}</p>
          <p>Tempo {zones.tempo[0]}-{zones.tempo[1]}</p>
          <p>Intervals {zones.interval[0]}-{zones.interval[1]}</p>
          <SaveCta />
        </div>
      ) : null}
    </div>
  );
}

function Pace() {
  const [miles, setMiles] = useState("3.1");
  const [minutes, setMinutes] = useState("24");
  const pace =
    Number(miles) > 0 && Number(minutes) > 0
      ? runningPaceFromDistance(Number(miles), Number(minutes))
      : null;
  return (
    <div className="space-y-4">
      <label className={label}>
        Distance (miles)
        <input className={field} value={miles} onChange={(e) => setMiles(e.target.value)} />
      </label>
      <label className={label}>
        Time (minutes)
        <input className={field} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </label>
      {pace ? (
        <div className="border border-brand-ink/10 bg-white p-4">
          <p className="font-display text-3xl">{pace.minPerMile} / mile</p>
          <p className="mt-1 font-sans text-sm text-brand-muted">{pace.mph} mph</p>
          <SaveCta />
        </div>
      ) : null}
    </div>
  );
}

function Creatine() {
  const [weightLb, setWeightLb] = useState("170");
  const dose = Number(weightLb) > 0 ? creatineDoseG(lbToKg(Number(weightLb))) : null;
  return (
    <div className="space-y-4">
      <label className={label}>
        Body weight (lb)
        <input className={field} value={weightLb} onChange={(e) => setWeightLb(e.target.value)} />
      </label>
      {dose ? (
        <div className="border border-brand-ink/10 bg-white p-4 font-sans text-sm">
          <p className="font-display text-3xl">{dose.daily} g / day</p>
          <p className="mt-2 text-brand-muted">
            Optional load: about {dose.optionalLoad} g/day split, for a week.
            Not medical advice.
          </p>
          <SaveCta />
        </div>
      ) : null}
    </div>
  );
}

function SexAgeHeightWeight(props: {
  sex: "male" | "female";
  setSex: (v: "male" | "female") => void;
  age: string;
  setAge: (v: string) => void;
  heightIn: string;
  setHeightIn: (v: string) => void;
  weightLb: string;
  setWeightLb: (v: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className={label}>
        Sex
        <select
          className={field}
          value={props.sex}
          onChange={(e) => props.setSex(e.target.value as "male" | "female")}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </label>
      <label className={label}>
        Age
        <input className={field} value={props.age} onChange={(e) => props.setAge(e.target.value)} />
      </label>
      <label className={label}>
        Height (inches)
        <input
          className={field}
          value={props.heightIn}
          onChange={(e) => props.setHeightIn(e.target.value)}
        />
      </label>
      <label className={label}>
        Weight (lb)
        <input
          className={field}
          value={props.weightLb}
          onChange={(e) => props.setWeightLb(e.target.value)}
        />
      </label>
    </div>
  );
}

function SaveCta() {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <SignupCtaLink
        location="tool_save_engine"
        className="inline-flex items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
      >
        Save to Engine
      </SignupCtaLink>
      <Link
        href="/app/onboarding"
        className="inline-flex items-center border border-brand-ink/20 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink"
      >
        Open onboarding
      </Link>
    </div>
  );
}
