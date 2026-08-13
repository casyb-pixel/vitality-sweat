"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resolveRestSec } from "@/lib/fitness/rest-defaults";
import type { PrimaryGoal } from "@/lib/fitness/types";
import type { WorkoutTip } from "@/lib/fitness/workout-tips";

const ALERT_PREF_KEY = "ve_workout_rest_alert";
const MAX_TIPS_PER_SESSION = 3;
const TIP_SHOW_MS_MIN = 8000;
const TIP_SHOW_MS_MAX = 12000;

type WorkoutRestCoachProps = {
  sessionId: string | null;
  active: boolean;
  /** Bump after each successful set log to auto-start rest. */
  restTrigger: number;
  programRestSec?: number | null;
  goal?: PrimaryGoal | null;
  exerciseId?: string | null;
  primaryMuscle?: string | null;
};

function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function readAlertPref(): boolean {
  try {
    return window.localStorage.getItem(ALERT_PREF_KEY) === "1";
  } catch {
    return false;
  }
}

function writeAlertPref(on: boolean) {
  try {
    window.localStorage.setItem(ALERT_PREF_KEY, on ? "1" : "0");
  } catch {
    // ignore
  }
}

function playSoftChime() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.4);
    window.setTimeout(() => {
      void ctx.close();
    }, 500);
  } catch {
    // ignore
  }
}

function maybeVibrate() {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(40);
    }
  } catch {
    // ignore
  }
}

/**
 * Non-blocking rest timer + optional tip chip for active workout sessions.
 * Never gates set logging or navigation.
 */
export default function WorkoutRestCoach({
  sessionId,
  active,
  restTrigger,
  programRestSec,
  goal,
  exerciseId,
  primaryMuscle,
}: WorkoutRestCoachProps) {
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [alertOn, setAlertOn] = useState(false);
  const [tip, setTip] = useState<WorkoutTip | null>(null);
  const [tipsShown, setTipsShown] = useState(0);
  const dismissedRef = useRef<string[]>([]);
  const tipForRestRef = useRef(false);
  const lastTriggerRef = useRef(0);
  const tipTimerRef = useRef<number | null>(null);
  const completedAlertedRef = useRef(false);

  useEffect(() => {
    setAlertOn(readAlertPref());
  }, []);

  useEffect(() => {
    if (!active) {
      setRunning(false);
      setPaused(false);
      setRemaining(0);
      setTip(null);
      tipForRestRef.current = false;
      dismissedRef.current = [];
      setTipsShown(0);
      lastTriggerRef.current = 0;
      if (tipTimerRef.current != null) {
        window.clearTimeout(tipTimerRef.current);
        tipTimerRef.current = null;
      }
    }
  }, [active, sessionId]);

  // Auto-start rest when a set is logged.
  useEffect(() => {
    if (!active || !sessionId || restTrigger <= 0) return;
    if (restTrigger === lastTriggerRef.current) return;
    lastTriggerRef.current = restTrigger;

    const seconds = resolveRestSec({ programRestSec, goal });
    setRemaining(seconds);
    setRunning(true);
    setPaused(false);
    completedAlertedRef.current = false;
    tipForRestRef.current = false;
    setTip(null);
    if (tipTimerRef.current != null) {
      window.clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }

    // Occasionally fetch a tip (not every rest).
    const shouldTip =
      tipsShown < MAX_TIPS_PER_SESSION && Math.random() < 0.55;
    if (!shouldTip) return;

    const exclude = dismissedRef.current.join(",");
    const params = new URLSearchParams();
    params.set("session_id", sessionId);
    if (goal) params.set("goal", goal);
    if (exerciseId) params.set("exercise_id", exerciseId);
    if (primaryMuscle) params.set("muscle", primaryMuscle);
    if (exclude) params.set("exclude", exclude);

    void fetch(`/api/app/workout/tips?${params.toString()}`)
      .then(async (res) => {
        const json = (await res.json()) as {
          ok?: boolean;
          tip?: WorkoutTip | null;
        };
        if (!res.ok || !json.ok || !json.tip) return;
        if (tipForRestRef.current) return;
        if (dismissedRef.current.includes(json.tip.id)) return;
        tipForRestRef.current = true;
        dismissedRef.current = [...dismissedRef.current, json.tip.id];
        setTip(json.tip);
        setTipsShown((n) => n + 1);
        const hold =
          TIP_SHOW_MS_MIN +
          Math.floor(Math.random() * (TIP_SHOW_MS_MAX - TIP_SHOW_MS_MIN));
        tipTimerRef.current = window.setTimeout(() => {
          setTip(null);
          tipTimerRef.current = null;
        }, hold);
      })
      .catch(() => {
        // Tips are optional; never block the timer.
      });
  }, [
    active,
    sessionId,
    restTrigger,
    programRestSec,
    goal,
    exerciseId,
    primaryMuscle,
    tipsShown,
  ]);

  // Countdown tick.
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, paused]);

  // Completion alert (once) when timer hits zero.
  useEffect(() => {
    if (!running || remaining > 0 || completedAlertedRef.current) return;
    completedAlertedRef.current = true;
    setRunning(false);
    if (alertOn) {
      playSoftChime();
      maybeVibrate();
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification("Rest is over", {
            body: "Next set. Own it.",
            tag: "vitality-rest",
          });
          window.setTimeout(() => n.close(), 4000);
        }
      } catch {
        // ignore
      }
    }
  }, [remaining, running, alertOn]);

  function dismissTip() {
    setTip(null);
    if (tipTimerRef.current != null) {
      window.clearTimeout(tipTimerRef.current);
      tipTimerRef.current = null;
    }
  }

  function toggleAlert() {
    setAlertOn((prev) => {
      const next = !prev;
      writeAlertPref(next);
      return next;
    });
  }

  if (!active || !sessionId) return null;
  if (!running && remaining <= 0 && !tip) return null;

  const secondaryBtn =
    "inline-flex min-h-9 items-center justify-center border border-brand-ink/15 px-3 py-1.5 font-sans text-[11px] font-bold uppercase tracking-[0.06em] text-brand-ink hover:border-brand-orange hover:text-brand-orange";

  return (
    <div className="space-y-2" aria-live="polite">
      {running || remaining > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border border-brand-ink/10 bg-surface-elevated px-3 py-2.5">
          <div className="min-w-[4.5rem]">
            <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-brand-muted">
              Rest
            </p>
            <p className="font-display text-2xl tabular-nums text-brand-ink">
              {formatClock(remaining)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => setPaused((p) => !p)}
              disabled={remaining <= 0}
            >
              {paused ? "Resume" : "Pause"}
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                setRemaining((r) => r + 15);
                setRunning(true);
                completedAlertedRef.current = false;
              }}
            >
              +15s
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={() => {
                setRunning(false);
                setPaused(false);
                setRemaining(0);
              }}
            >
              Skip
            </button>
            <button
              type="button"
              className={secondaryBtn}
              onClick={toggleAlert}
              aria-pressed={alertOn}
              title="Completion sound / vibration (off by default)"
            >
              Alert {alertOn ? "on" : "off"}
            </button>
          </div>
          {remaining <= 0 ? (
            <p className="font-sans text-xs text-brand-orange">Ready</p>
          ) : null}
        </div>
      ) : null}

      {tip ? (
        <div className="relative border border-brand-orange/25 bg-brand-orange/5 px-3 py-2.5 pr-9">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.12em] text-brand-orange">
            {tip.kind === "chronicle"
              ? "Chronicle"
              : tip.kind === "fuel"
                ? "Fuel note"
                : "Quick tip"}
          </p>
          <p className="mt-0.5 font-sans text-sm font-semibold text-brand-ink">
            {tip.title}
          </p>
          <p className="mt-0.5 font-sans text-xs leading-relaxed text-brand-muted">
            {tip.body}
          </p>
          {tip.href ? (
            <Link
              href={tip.href}
              className="mt-1.5 inline-block font-sans text-xs font-bold text-brand-orange hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Read more
            </Link>
          ) : null}
          <button
            type="button"
            onClick={dismissTip}
            className="absolute right-2 top-2 font-sans text-xs font-semibold text-brand-muted hover:text-brand-ink"
            aria-label="Dismiss tip"
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
