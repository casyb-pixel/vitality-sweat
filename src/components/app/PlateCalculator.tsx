"use client";

import { useMemo, useState } from "react";
import { platesForTarget } from "@/lib/fitness/plates";

export default function PlateCalculator({ targetLb }: { targetLb: number }) {
  const [barLb, setBarLb] = useState(45);
  const plan = useMemo(
    () => platesForTarget({ targetLb, barLb }),
    [targetLb, barLb],
  );

  return (
    <div className="border border-brand-ink/10 bg-surface-elevated p-3">
      <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
        Load the bar
      </p>
      <label className="mt-2 block font-sans text-xs text-brand-muted">
        Bar
        <select
          value={barLb}
          onChange={(e) => setBarLb(Number(e.target.value))}
          className="ml-2 border border-brand-ink/15 px-2 py-1"
        >
          <option value={45}>45 lb</option>
          <option value={35}>35 lb</option>
          <option value={15}>15 lb technique</option>
        </select>
      </label>
      {plan.perSide.length === 0 ? (
        <p className="mt-2 font-sans text-sm text-brand-muted">
          Just the bar ({plan.barLb} lb).
        </p>
      ) : (
        <ul className="mt-2 space-y-1 font-sans text-sm text-brand-ink">
          {plan.perSide.map((row) => (
            <li key={row.plate}>
              {row.count} × {row.plate} lb each side
            </li>
          ))}
        </ul>
      )}
      {!plan.exact ? (
        <p className="mt-2 font-sans text-xs text-brand-muted">
          Closest with these plates. Remainder {plan.remainderLb} lb.
        </p>
      ) : null}
    </div>
  );
}
