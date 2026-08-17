"use client";

import { useState } from "react";
import { useAddToHomeScreen } from "@/components/app/AddToHomeScreen";
import type { FitnessProfile, UnitSystem } from "@/lib/fitness/types";

type SettingsClientProps = {
  profile: FitnessProfile;
  username?: string | null;
  enginePlus?: boolean;
};

export default function MemberSettingsClient({
  profile,
  username: initialUsername = "",
  enginePlus: initialPlus = false,
}: SettingsClientProps) {
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(
    profile.unit_system ?? "imperial",
  );
  const [weightLb, setWeightLb] = useState(
    profile.weight_lb != null ? String(profile.weight_lb) : "",
  );
  const [restSec, setRestSec] = useState(
    profile.default_rest_sec != null ? String(profile.default_rest_sec) : "",
  );
  const [notify, setNotify] = useState(Boolean(profile.notifications_opt_in));
  const [leaderboardOn, setLeaderboardOn] = useState(
    profile.leaderboard_opt_in !== false,
  );
  const [sessionCoachOn, setSessionCoachOn] = useState(
    profile.session_coach_opt_in !== false,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [username, setUsername] = useState(initialUsername ?? "");
  const [followUser, setFollowUser] = useState("");
  const [enginePlus, setEnginePlus] = useState(initialPlus);
  const a2hs = useAddToHomeScreen();

  async function save() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/app/fitness-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_system: unitSystem,
          weight_lb: weightLb ? Number(weightLb) : undefined,
          default_rest_sec: restSec ? Number(restSec) : null,
          notifications_opt_in: notify,
          leaderboard_opt_in: leaderboardOn,
          session_coach_opt_in: sessionCoachOn,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not save settings.");
        return;
      }
      setMessage("Settings saved.");
      if (notify && typeof Notification !== "undefined") {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
      }
    } catch {
      setError("Could not save settings.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">Settings</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          How the Engine fits you
        </h1>
      </header>

      <fieldset className="space-y-2">
        <legend className="font-sans text-sm font-semibold text-brand-ink">
          Units
        </legend>
        {(["imperial", "metric"] as const).map((opt) => (
          <label key={opt} className="flex items-center gap-2 font-sans text-sm">
            <input
              type="radio"
              name="units"
              checked={unitSystem === opt}
              onChange={() => setUnitSystem(opt)}
            />
            {opt === "imperial" ? "Pounds / inches" : "Kilograms / cm"}
          </label>
        ))}
      </fieldset>

      <label className="block font-sans text-sm font-semibold text-brand-ink">
        Current weight (lb)
        <input
          type="number"
          min={1}
          step="0.1"
          value={weightLb}
          onChange={(e) => setWeightLb(e.target.value)}
          className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm"
        />
      </label>

      <label className="block font-sans text-sm font-semibold text-brand-ink">
        Default rest (seconds)
        <input
          type="number"
          min={15}
          max={600}
          value={restSec}
          onChange={(e) => setRestSec(e.target.value)}
          placeholder="90"
          className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm"
        />
      </label>

      <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
        <input
          type="checkbox"
          checked={notify}
          onChange={(e) => setNotify(e.target.checked)}
        />
        Rest-timer and Daily Brief alerts (needs Home Screen install on iPhone)
      </label>

      <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
        <input
          type="checkbox"
          checked={leaderboardOn}
          onChange={(e) => setLeaderboardOn(e.target.checked)}
        />
        Show Engine Room leaderboards (off hides boards and removes you from rankings)
      </label>

      <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
        <input
          type="checkbox"
          checked={sessionCoachOn}
          onChange={(e) => setSessionCoachOn(e.target.checked)}
        />
        Workout start coach (challenges and comments when a session begins)
      </label>

      {a2hs.isStandalone ? (
        <p className="font-sans text-sm text-brand-muted">
          Vitality Engine is already on this Home Screen.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void a2hs.installOrExplain()}
          className="block font-sans text-xs font-semibold text-brand-orange"
        >
          How to add Vitality Engine to my Home Screen
        </button>
      )}

      <label className="block font-sans text-sm font-semibold text-brand-ink">
        Username (follow friends)
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm"
          placeholder="hunter"
        />
      </label>
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/app/account", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username }),
          });
          setMessage("Username saved. Logging stays free.");
        }}
        className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
      >
        Save username
      </button>

      <label className="block font-sans text-sm font-semibold text-brand-ink">
        Follow a teammate
        <input
          value={followUser}
          onChange={(e) => setFollowUser(e.target.value)}
          className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2.5 font-sans text-sm"
          placeholder="their username"
        />
      </label>
      <button
        type="button"
        onClick={async () => {
          const res = await fetch("/api/app/follows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: followUser }),
          });
          const json = (await res.json()) as { ok?: boolean; error?: string };
          setMessage(json.ok ? "Following." : json.error ?? "Could not follow.");
        }}
        className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
      >
        Follow
      </button>

      <label className="flex items-center gap-2 font-sans text-sm text-brand-ink">
        <input
          type="checkbox"
          checked={enginePlus}
          onChange={async (e) => {
            const next = e.target.checked;
            setEnginePlus(next);
            await fetch("/api/app/account", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engine_plus: next }),
            });
          }}
        />
        Engine Plus flag (advanced charts later). Logging stays free either way.
      </label>

      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="font-sans text-sm text-brand-ink">{message}</p>
      ) : null}

      <button
        type="button"
        onClick={() => void save()}
        disabled={pending}
        className="inline-flex min-h-11 items-center bg-brand-orange px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
