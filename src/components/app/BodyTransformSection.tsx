"use client";

import { useMemo, useState } from "react";
import {
  MEASUREMENT_FIELDS,
  MEASUREMENT_LABELS,
  type BodyMeasurementLog,
  type MeasurementField,
} from "@/lib/fitness/body-logs";
import type { PrimaryGoal } from "@/lib/fitness/types";

type WeightPoint = {
  recorded_on: string;
  weight_lb: number;
  bmi: number | null;
};

type BodyTransformSectionProps = {
  goal: PrimaryGoal | null;
  regularTraining: boolean;
  weights: WeightPoint[];
  measurements: BodyMeasurementLog[];
  onRefresh: () => Promise<void>;
};

function tapePrompt(goal: PrimaryGoal | null): boolean {
  return goal === "muscle_gain" || goal === "strength";
}

function weightPrompt(goal: PrimaryGoal | null, regularTraining: boolean): boolean {
  return goal === "weight_loss" && regularTraining;
}

export default function BodyTransformSection({
  goal,
  regularTraining,
  weights,
  measurements,
  onRefresh,
}: BodyTransformSectionProps) {
  const [weightLb, setWeightLb] = useState("");
  const [tape, setTape] = useState<Record<MeasurementField, string>>({
    neck_in: "",
    shoulders_in: "",
    chest_in: "",
    bicep_in: "",
    waist_in: "",
    hip_in: "",
    thigh_in: "",
    calf_in: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showWeight, setShowWeight] = useState(false);
  const [showTape, setShowTape] = useState(false);

  const latestWeight = weights[weights.length - 1] ?? null;
  const latestTape = measurements[measurements.length - 1] ?? null;
  const maxWeight = Math.max(1, ...weights.map((w) => Number(w.weight_lb)));
  const showTapeUi = tapePrompt(goal) || goal == null || !["weight_loss"].includes(goal);
  const promptTape = tapePrompt(goal);
  const promptWeight = weightPrompt(goal, regularTraining);

  const latestSites = useMemo(() => {
    if (!latestTape) return [];
    return MEASUREMENT_FIELDS.filter((field) => latestTape[field] != null).map(
      (field) => `${MEASUREMENT_LABELS[field]} ${latestTape[field]} in`,
    );
  }, [latestTape]);

  async function saveWeight() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/app/progress/body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "weight", weight_lb: Number(weightLb) }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; bmi?: number | null };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not save weigh-in.");
        return;
      }
      setMessage(
        json.bmi != null
          ? `Saved. BMI ${json.bmi}.`
          : "Weigh-in saved.",
      );
      setWeightLb("");
      setShowWeight(false);
      await onRefresh();
    } finally {
      setPending(false);
    }
  }

  async function saveTape() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { kind: "measurements" };
      for (const field of MEASUREMENT_FIELDS) {
        if (tape[field].trim()) payload[field] = Number(tape[field]);
      }
      const res = await fetch("/api/app/progress/body", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not save measurements.");
        return;
      }
      setMessage("Measurements saved.");
      setShowTape(false);
      await onRefresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4 border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
      <div>
        <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">
          Body
        </p>
        <h2 className="font-display text-xl text-brand-ink">
          How you are changing
        </h2>
        <p className="mt-1 font-sans text-sm text-brand-muted">
          Private log. BMI is a number from your height and weight, not a verdict.
        </p>
      </div>

      {promptTape ? (
        <p className="border border-brand-orange/25 bg-brand-orange/5 px-3 py-2 font-sans text-sm text-brand-ink">
          Track tape measurements so growth shows up, not only the scale.
        </p>
      ) : null}
      {promptWeight ? (
        <p className="border border-brand-orange/25 bg-brand-orange/5 px-3 py-2 font-sans text-sm text-brand-ink">
          You have been training. Log weight and BMI when you can.
        </p>
      ) : null}

      {latestWeight ? (
        <p className="font-sans text-sm text-brand-ink">
          Latest: {latestWeight.weight_lb} lb
          {latestWeight.bmi != null ? ` · BMI ${latestWeight.bmi}` : ""}
          {" · "}
          {latestWeight.recorded_on}
        </p>
      ) : (
        <p className="font-sans text-sm text-brand-muted">No weigh-ins yet.</p>
      )}

      {weights.length > 1 ? (
        <div className="flex h-16 items-end gap-1">
          {weights.slice(-16).map((point) => (
            <div
              key={point.recorded_on}
              className="flex-1 bg-brand-orange/70"
              style={{
                height: `${Math.max(8, (Number(point.weight_lb) / maxWeight) * 100)}%`,
              }}
              title={`${point.recorded_on}: ${point.weight_lb} lb`}
            />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
          onClick={() => setShowWeight((open) => !open)}
        >
          Log weigh-in
        </button>
        {showTapeUi ? (
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange"
            onClick={() => setShowTape((open) => !open)}
          >
            Log measurements
          </button>
        ) : null}
      </div>

      {showWeight ? (
        <div className="space-y-2">
          <label className="block font-sans text-sm font-semibold text-brand-ink">
            Weight (lb)
            <input
              type="number"
              min={1}
              step="0.1"
              value={weightLb}
              onChange={(e) => setWeightLb(e.target.value)}
              className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={() => void saveWeight()}
            className="inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save weigh-in"}
          </button>
        </div>
      ) : null}

      {latestSites.length ? (
        <p className="font-sans text-sm text-brand-muted">
          Latest tape: {latestSites.join(" · ")}
        </p>
      ) : null}

      {showTape ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {MEASUREMENT_FIELDS.map((field) => (
            <label key={field} className="block font-sans text-sm font-semibold text-brand-ink">
              {MEASUREMENT_LABELS[field]} (in)
              <input
                type="number"
                min={0}
                step="0.1"
                value={tape[field]}
                onChange={(e) =>
                  setTape((prev) => ({ ...prev, [field]: e.target.value }))
                }
                className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm"
              />
            </label>
          ))}
          <button
            type="button"
            disabled={pending}
            onClick={() => void saveTape()}
            className="inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60 sm:col-span-2"
          >
            {pending ? "Saving…" : "Save measurements"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="font-sans text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="font-sans text-sm text-brand-muted">{message}</p>
      ) : null}
    </section>
  );
}
