"use client";

import { useEffect, useState } from "react";

export default function FuelLogClient() {
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [water, setWater] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/app/fuel-log");
      const json = (await res.json()) as {
        log?: {
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
          water_oz?: number | null;
        };
      };
      if (json.log) {
        setCalories(json.log.calories != null ? String(json.log.calories) : "");
        setProtein(json.log.protein_g != null ? String(json.log.protein_g) : "");
        setCarbs(json.log.carbs_g != null ? String(json.log.carbs_g) : "");
        setFat(json.log.fat_g != null ? String(json.log.fat_g) : "");
        setWater(json.log.water_oz != null ? String(json.log.water_oz) : "");
      }
    })();
  }, []);

  async function save() {
    const res = await fetch("/api/app/fuel-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calories: calories ? Number(calories) : null,
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
        water_oz: water ? Number(water) : null,
      }),
    });
    const json = (await res.json()) as { ok?: boolean };
    setMessage(json.ok ? "Fuel logged for today." : "Could not save fuel log.");
  }

  const field =
    "mt-1 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm";

  return (
    <section className="border border-brand-ink/10 bg-surface-elevated p-4">
      <h2 className="font-display text-xl text-brand-ink">Today's fuel log</h2>
      <p className="mt-1 font-sans text-sm text-brand-muted">
        Quick totals from your TDEE targets. No barcode database.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="font-sans text-xs text-brand-muted">
          Calories
          <input className={field} value={calories} onChange={(e) => setCalories(e.target.value)} />
        </label>
        <label className="font-sans text-xs text-brand-muted">
          Protein (g)
          <input className={field} value={protein} onChange={(e) => setProtein(e.target.value)} />
        </label>
        <label className="font-sans text-xs text-brand-muted">
          Carbs (g)
          <input className={field} value={carbs} onChange={(e) => setCarbs(e.target.value)} />
        </label>
        <label className="font-sans text-xs text-brand-muted">
          Fat (g)
          <input className={field} value={fat} onChange={(e) => setFat(e.target.value)} />
        </label>
        <label className="font-sans text-xs text-brand-muted">
          Water (oz)
          <input className={field} value={water} onChange={(e) => setWater(e.target.value)} />
        </label>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        className="mt-4 bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
      >
        Save today
      </button>
      {message ? (
        <p className="mt-2 font-sans text-sm text-brand-muted">{message}</p>
      ) : null}
    </section>
  );
}
