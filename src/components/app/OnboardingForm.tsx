"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { isValidUsZip, normalizeUsZip } from "@/lib/auth/member-profile";
import {
  birthdateFromAge,
  parseCommaList,
} from "@/lib/fitness/profile";
import {
  FITNESS_LEVEL_LABELS,
  GOALS_REQUIRING_TARGET_WEIGHT,
  PRIMARY_GOAL_LABELS,
  type FitnessLevel,
  type PrimaryGoal,
  type Sex,
} from "@/lib/fitness/types";

const LEVELS = Object.keys(FITNESS_LEVEL_LABELS) as FitnessLevel[];
const GOALS = Object.keys(PRIMARY_GOAL_LABELS) as PrimaryGoal[];

type OnboardingFormProps = {
  initialCity?: string;
  initialZipCode?: string;
  initialRegion?: string;
};

export default function OnboardingForm({
  initialCity = "",
  initialZipCode = "",
  initialRegion = "",
}: OnboardingFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [city, setCity] = useState(initialCity);
  const [zipCode, setZipCode] = useState(initialZipCode);
  const [region, setRegion] = useState(initialRegion);
  const [sex, setSex] = useState<Sex | "">("");
  const [age, setAge] = useState("");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [waistIn, setWaistIn] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | "">("");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">("");
  const [targetWeightLb, setTargetWeightLb] = useState("");
  const [dislikedFoods, setDislikedFoods] = useState("");
  const [foodAllergies, setFoodAllergies] = useState("");
  const [healthConditions, setHealthConditions] = useState("");
  const [activityRestrictions, setActivityRestrictions] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const trimmedCity = city.trim();
        if (!trimmedCity) {
          setError("Enter your city.");
          return;
        }
        const zip = normalizeUsZip(zipCode);
        if (!isValidUsZip(zip)) {
          setError("Enter a valid US ZIP code (12345 or 12345-6789).");
          return;
        }
        if (sex !== "male" && sex !== "female") {
          setError("Select male or female.");
          return;
        }
        const ageNum = Number(age);
        if (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 100) {
          setError("Enter a valid age between 13 and 100.");
          return;
        }
        const ft = Number(heightFt);
        const inches = Number(heightIn || 0);
        if (!Number.isFinite(ft) || ft < 3 || ft > 8) {
          setError("Enter height in feet (and optional inches).");
          return;
        }
        const totalInches = ft * 12 + (Number.isFinite(inches) ? inches : 0);
        const weight = Number(weightLb);
        if (!Number.isFinite(weight) || weight <= 0) {
          setError("Enter your current weight in pounds.");
          return;
        }
        if (!fitnessLevel) {
          setError("Select your current fitness level.");
          return;
        }
        if (!primaryGoal) {
          setError("Select a primary fitness goal.");
          return;
        }
        if (GOALS_REQUIRING_TARGET_WEIGHT.has(primaryGoal)) {
          const target = Number(targetWeightLb);
          if (!Number.isFinite(target) || target <= 0) {
            setError("Enter your target weight in pounds.");
            return;
          }
        }

        const res = await fetch("/api/app/fitness-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            city: trimmedCity,
            zip_code: zip,
            region: region.trim() || null,
            sex,
            birthdate: birthdateFromAge(ageNum),
            height_in: totalInches,
            weight_lb: weight,
            waist_in: waistIn ? Number(waistIn) : null,
            fitness_level: fitnessLevel,
            primary_goal: primaryGoal,
            target_weight_lb: targetWeightLb ? Number(targetWeightLb) : null,
            disliked_foods: parseCommaList(dislikedFoods),
            food_allergies: parseCommaList(foodAllergies),
            health_conditions: parseCommaList(healthConditions),
            activity_restrictions: activityRestrictions.trim() || null,
          }),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Could not save your profile.");
          return;
        }

        router.replace("/app?share=engine");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed.");
      }
    });
  }

  const fieldClass =
    "mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";
  const labelClass = "block font-sans text-sm font-semibold text-brand-ink";

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
        <h2 className="font-display text-xl text-brand-ink">Where you train</h2>
        <p className="font-sans text-sm text-brand-muted">
          City and ZIP help us connect you with local Vitality Sweat partners
          and community offers.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="city" className={labelClass}>
              City
            </label>
            <input
              id="city"
              type="text"
              required
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Lafayette"
            />
          </div>
          <div>
            <label htmlFor="zip" className={labelClass}>
              ZIP code
            </label>
            <input
              id="zip"
              type="text"
              required
              inputMode="numeric"
              autoComplete="postal-code"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value)}
              className={fieldClass}
              placeholder="70501"
              pattern="\d{5}(-\d{4})?"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="region" className={labelClass}>
              Parish / region (optional)
            </label>
            <input
              id="region"
              type="text"
              autoComplete="address-level1"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Lafayette Parish"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
        <h2 className="font-display text-xl text-brand-ink">About you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sex" className={labelClass}>
              Sex
            </label>
            <select
              id="sex"
              required
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | "")}
              className={fieldClass}
            >
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label htmlFor="age" className={labelClass}>
              Age
            </label>
            <input
              id="age"
              type="number"
              min={13}
              max={100}
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Height</label>
            <div className="mt-1.5 flex gap-2">
              <input
                aria-label="Feet"
                type="number"
                min={3}
                max={8}
                required
                placeholder="ft"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                className={fieldClass + " mt-0"}
              />
              <input
                aria-label="Inches"
                type="number"
                min={0}
                max={11}
                placeholder="in"
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                className={fieldClass + " mt-0"}
              />
            </div>
          </div>
          <div>
            <label htmlFor="weight" className={labelClass}>
              Weight (lb)
            </label>
            <input
              id="weight"
              type="number"
              min={50}
              max={800}
              step="0.1"
              required
              value={weightLb}
              onChange={(e) => setWeightLb(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="waist" className={labelClass}>
              Waist (in, optional)
            </label>
            <input
              id="waist"
              type="number"
              min={15}
              max={100}
              step="0.1"
              value={waistIn}
              onChange={(e) => setWaistIn(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
        <h2 className="font-display text-xl text-brand-ink">Training goals</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="level" className={labelClass}>
              Current fitness level
            </label>
            <select
              id="level"
              required
              value={fitnessLevel}
              onChange={(e) =>
                setFitnessLevel(e.target.value as FitnessLevel | "")
              }
              className={fieldClass}
            >
              <option value="">Select…</option>
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {FITNESS_LEVEL_LABELS[level]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="goal" className={labelClass}>
              Primary goal
            </label>
            <select
              id="goal"
              required
              value={primaryGoal}
              onChange={(e) =>
                setPrimaryGoal(e.target.value as PrimaryGoal | "")
              }
              className={fieldClass}
            >
              <option value="">Select…</option>
              {GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {PRIMARY_GOAL_LABELS[goal]}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="targetWeight" className={labelClass}>
              {primaryGoal && GOALS_REQUIRING_TARGET_WEIGHT.has(primaryGoal)
                ? "Target weight (lb)"
                : "Target weight (lb, optional)"}
            </label>
            <input
              id="targetWeight"
              type="number"
              min={50}
              max={800}
              step="0.1"
              required={
                Boolean(
                  primaryGoal && GOALS_REQUIRING_TARGET_WEIGHT.has(primaryGoal),
                )
              }
              value={targetWeightLb}
              onChange={(e) => setTargetWeightLb(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-brand-ink/10 bg-surface-elevated p-5 sm:p-6">
        <h2 className="font-display text-xl text-brand-ink">
          Nutrition &amp; health
        </h2>
        <p className="font-sans text-sm text-brand-muted">
          Separate multiple items with commas. This helps Gemini build meal
          plans that fit your kitchen and keep you safe.
        </p>
        <div>
          <label htmlFor="dislikes" className={labelClass}>
            Foods you really don’t like
          </label>
          <input
            id="dislikes"
            type="text"
            placeholder="e.g. mushrooms, olives, cottage cheese"
            value={dislikedFoods}
            onChange={(e) => setDislikedFoods(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="allergies" className={labelClass}>
            Food allergies
          </label>
          <input
            id="allergies"
            type="text"
            placeholder="e.g. peanuts, shellfish, dairy"
            value={foodAllergies}
            onChange={(e) => setFoodAllergies(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="conditions" className={labelClass}>
            Health conditions that may restrict activity
          </label>
          <input
            id="conditions"
            type="text"
            placeholder="e.g. heart condition, asthma, knee injury"
            value={healthConditions}
            onChange={(e) => setHealthConditions(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="restrictions" className={labelClass}>
            Activity restrictions (optional notes)
          </label>
          <textarea
            id="restrictions"
            rows={3}
            placeholder="Anything coaches or meal planning should know…"
            value={activityRestrictions}
            onChange={(e) => setActivityRestrictions(e.target.value)}
            className={fieldClass}
          />
        </div>
      </section>

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-4 py-3 font-sans text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center bg-brand-orange px-6 py-3 font-sans text-sm font-bold uppercase tracking-[0.1em] text-white hover:bg-brand-orange-deep disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Saving…" : "Save & open my dashboard"}
      </button>
    </form>
  );
}
