"use client";

import { useEffect, useRef, useState } from "react";
import { LAST_GYM_STORAGE_KEY, type GymOption } from "@/lib/gyms/names";

type GymsResponse = {
  ok?: boolean;
  gyms?: GymOption[];
  lastGym?: string | null;
};

export default function GymCheckInPicker({
  sessionId,
  gymName,
  onChange,
}: {
  sessionId?: string | null;
  gymName: string;
  onChange: (next: { name: string; optionId: string | null }) => void;
}) {
  const [gyms, setGyms] = useState<GymOption[]>([]);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void (async () => {
      const res = await fetch("/api/app/gyms");
      const json = (await res.json()) as GymsResponse;
      if (!res.ok || !json.ok) return;
      setGyms(json.gyms ?? []);
      if (gymName) return;
      let last = json.lastGym ?? "";
      if (!last) {
        try {
          last = window.localStorage.getItem(LAST_GYM_STORAGE_KEY) ?? "";
        } catch {
          last = "";
        }
      }
      if (last) onChange({ name: last, optionId: null });
    })();
    // First load only. Parent owns gymName after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId || !gymName.trim()) return;
    const match = gyms.find(
      (g) => g.name.toLowerCase() === gymName.trim().toLowerCase(),
    );
    const optionId = match?.id ?? null;
    const timer = window.setTimeout(() => {
      setSaving(true);
      void fetch("/api/app/workout/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          gym_name: gymName,
          gym_option_id: optionId,
        }),
      }).finally(() => setSaving(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [sessionId, gymName, gyms]);

  return (
    <label className="block">
      <span className="font-sans text-sm font-semibold text-brand-ink">
        Training at
      </span>
      <input
        list="vs-gym-checkin"
        value={gymName}
        onChange={(e) => {
          const name = e.target.value;
          const match = gyms.find(
            (g) => g.name.toLowerCase() === name.trim().toLowerCase(),
          );
          onChange({ name, optionId: match?.id ?? null });
          try {
            window.localStorage.setItem(LAST_GYM_STORAGE_KEY, name);
          } catch {
            // ignore
          }
        }}
        placeholder="Pick a gym or type one"
        className="mt-1.5 w-full border border-brand-ink/15 bg-surface-elevated px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange"
      />
      <datalist id="vs-gym-checkin">
        {gyms.map((gym) => (
          <option key={gym.id} value={gym.name}>
            {gym.metro ? gym.metro : gym.source === "partner" ? "Partner" : ""}
          </option>
        ))}
      </datalist>
      <p className="mt-1 font-sans text-xs text-brand-muted">
        {saving
          ? "Saving check-in…"
          : "No GPS. Pick a listed gym or type the name."}
      </p>
    </label>
  );
}
