"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  kind: string;
  deep_link: string;
  status: string;
  due_at: string;
};

export default function DailyBriefClient({
  coachView = false,
}: {
  coachView?: boolean;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [icsUrl, setIcsUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/creator/tasks", { method: "GET" });
    const json = (await res.json()) as {
      ok?: boolean;
      tasks?: Task[];
      error?: string;
    };
    if (!json.ok) {
      setError(json.error ?? "Could not load tasks.");
      return;
    }
    setTasks(json.tasks ?? []);
  }

  useEffect(() => {
    void (async () => {
      await fetch("/api/creator/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "materialize" }),
      });
      await refresh();
      const ics = await fetch("/api/creator/calendar.ics");
      if (ics.ok) {
        const json = (await ics.json()) as { ok?: boolean; url?: string };
        if (json.url) setIcsUrl(json.url);
      }
    })();
  }, []);

  async function setStatus(id: string, status: string) {
    await fetch("/api/creator/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await refresh();
  }

  const pending = tasks.filter((t) => t.status === "pending");
  const current = pending[0];

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-brand-orange">Daily Brief</p>
        <h1 className="font-display text-3xl text-brand-ink">
          {coachView ? "Hunter's tasks today" : "Today's three"}
        </h1>
        <p className="mt-2 font-sans text-sm text-brand-muted">
          School quiet hours 7:20am-11:30am Chicago time (senior semester, two
          classes). After 11:45am, finish what is on this list. Do not invent
          extra work.
        </p>
      </header>

      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}

      {current ? (
        <div className="border border-brand-orange bg-brand-orange/5 p-5">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.1em] text-brand-orange">
            Do this next
          </p>
          <h2 className="mt-2 font-display text-2xl text-brand-ink">
            {current.title}
          </h2>
          {!coachView ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={current.deep_link}
                className="inline-flex min-h-11 items-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
              >
                Open
              </a>
              <button
                type="button"
                onClick={() => void setStatus(current.id, "done")}
                className="inline-flex min-h-11 items-center border border-brand-ink/20 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em]"
              >
                Mark done
              </button>
              <button
                type="button"
                onClick={() => void setStatus(current.id, "snoozed")}
                className="font-sans text-xs font-semibold text-brand-muted"
              >
                Snooze until after school
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="font-sans text-sm text-brand-muted">
          Nothing pending. Rest, lift, or approve catalog pages.
        </p>
      )}

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="border border-brand-ink/10 bg-surface-elevated px-4 py-3 font-sans text-sm"
          >
            <span className="font-semibold text-brand-ink">{task.title}</span>
            <span className="ml-2 text-brand-muted">{task.status}</span>
          </li>
        ))}
      </ul>

      {icsUrl ? (
        <p className="font-sans text-xs text-brand-muted">
          Subscribe in Apple Calendar:{" "}
          <a className="text-brand-orange" href={icsUrl}>
            {icsUrl}
          </a>
        </p>
      ) : null}

      {!coachView ? (
        <button
          type="button"
          onClick={async () => {
            if (typeof Notification === "undefined") return;
            const perm = await Notification.requestPermission();
            if (perm !== "granted" || !("serviceWorker" in navigator)) return;
            const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapid) {
              setError(null);
              return;
            }
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: vapid,
            });
            const json = sub.toJSON();
            await fetch("/api/creator/push", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                endpoint: json.endpoint,
                keys: json.keys,
              }),
            });
          }}
          className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-orange"
        >
          Enable lock-screen alerts
        </button>
      ) : null}
    </div>
  );
}
