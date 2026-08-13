"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkoutSession, WorkoutSet } from "@/lib/fitness/types";

type SessionRow = WorkoutSession;

type DetailPayload = {
  ok?: boolean;
  session?: WorkoutSession;
  sets?: WorkoutSet[];
  exercises?: { id: string; name: string; tracking_type: string }[];
  error?: string;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function WorkoutHistoryClient() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/app/workout/session?limit=40");
      const json = (await res.json()) as {
        ok?: boolean;
        sessions?: SessionRow[];
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not load history.");
        return;
      }
      setSessions(json.sessions ?? []);
    } catch {
      setError("Could not load history.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionRow[]>();
    for (const session of sessions) {
      const key = dayKey(session.started_at);
      const list = map.get(key) ?? [];
      list.push(session);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [sessions]);

  async function openSession(id: string) {
    setOpenId(id);
    setDetail(null);
    const res = await fetch(
      `/api/app/workout/session?id=${encodeURIComponent(id)}`,
    );
    const json = (await res.json()) as DetailPayload;
    setDetail(json);
    setNotes(json.session?.notes ?? "");
  }

  async function saveNotes() {
    if (!openId) return;
    setSaving(true);
    try {
      await fetch("/api/app/workout/session", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: openId, notes }),
      });
      await openSession(openId);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteSet(id: string) {
    await fetch(`/api/app/workout/sets?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (openId) await openSession(openId);
  }

  const exerciseName = (id: string) =>
    detail?.exercises?.find((e) => e.id === id)?.name ?? "Exercise";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow text-brand-orange">History</p>
        <h1 className="font-display text-[clamp(1.85rem,5vw,2.75rem)] leading-[1.05] text-brand-ink">
          What you already lifted
        </h1>
        <p className="max-w-xl font-sans text-sm text-brand-muted">
          Every completed session lives here. Open one to edit notes or delete a
          bad set.
        </p>
      </header>

      {loading ? (
        <p className="font-sans text-sm text-brand-muted">Loading sessions…</p>
      ) : null}
      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}
      {!loading && sessions.length === 0 ? (
        <div className="border border-brand-ink/10 bg-surface-elevated p-5">
          <p className="font-sans text-sm text-brand-muted">
            No workouts logged yet. Start one and it will show up here.
          </p>
          <Link
            href="/app/workout"
            className="mt-4 inline-flex min-h-10 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep"
          >
            Open workout
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <ol className="space-y-5">
          {grouped.map(([day, rows]) => (
            <li key={day}>
              <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-muted">
                {day}
              </p>
              <ul className="mt-2 space-y-2">
                {rows.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => void openSession(session.id)}
                      className={`w-full border px-4 py-3 text-left ${
                        openId === session.id
                          ? "border-brand-orange bg-brand-orange/10"
                          : "border-brand-ink/10 bg-surface-elevated hover:border-brand-orange"
                      }`}
                    >
                      <span className="font-sans text-sm font-semibold text-brand-ink">
                        {new Date(session.started_at).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {session.status}
                      </span>
                      {session.notes ? (
                        <span className="mt-1 block font-sans text-xs text-brand-muted">
                          {session.notes}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        {openId && detail?.session ? (
          <div className="border border-brand-ink/10 bg-surface-elevated p-5">
            <h2 className="font-display text-xl text-brand-ink">Session</h2>
            <ul className="mt-3 space-y-2">
              {(detail.sets ?? []).map((set) => (
                <li
                  key={set.id}
                  className="flex items-start justify-between gap-3 border-b border-brand-ink/5 py-2"
                >
                  <div>
                    <p className="font-sans text-sm font-semibold text-brand-ink">
                      {exerciseName(set.exercise_id)}
                    </p>
                    <p className="font-sans text-xs text-brand-muted">
                      Set {set.set_number}
                      {set.set_kind ? ` · ${set.set_kind}` : ""}
                      {set.weight_lb != null ? ` · ${set.weight_lb} lb` : ""}
                      {set.reps != null ? ` · ${set.reps} reps` : ""}
                      {set.duration_sec != null
                        ? ` · ${set.duration_sec}s`
                        : ""}
                      {set.distance_m != null ? ` · ${set.distance_m} m` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void deleteSet(set.id)}
                    className="font-sans text-xs font-semibold text-brand-muted hover:text-brand-orange"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
            <label className="mt-4 block font-sans text-sm font-semibold text-brand-ink">
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="mt-1.5 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void saveNotes()}
              disabled={saving}
              className="mt-3 inline-flex min-h-10 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
          </div>
        ) : (
          <p className="font-sans text-sm text-brand-muted">
            Pick a session to see every set.
          </p>
        )}
      </div>
    </div>
  );
}
