"use client";

import { useEffect, useState } from "react";
import { POST_CLUSTERS } from "@/lib/blog/supabase-posts";

type CalendarPost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  editorial_status?: string | null;
  cluster?: string | null;
  due_at?: string | null;
  published_at?: string | null;
};

export default function EditorialCalendarPanel() {
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/creator/calendar")
      .then((res) => res.json())
      .then((json: { ok?: boolean; posts?: CalendarPost[]; error?: string }) => {
        if (!json.ok) {
          setError(json.error ?? "Could not load calendar.");
          return;
        }
        setPosts(json.posts ?? []);
      })
      .catch(() => setError("Could not load calendar."));
  }, []);

  const start = startOfWeek(new Date());
  const days = Array.from({ length: 28 }, (_, i) => addDays(start, i));

  return (
    <div className="space-y-4">
      <p className="font-sans text-sm text-brand-muted">
        Four-week view. Due dates come from drafts, scheduled posts, and
        marketing project windows.
      </p>
      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = day.toISOString().slice(0, 10);
          const items = posts.filter((p) => {
            const due = (p.due_at || p.published_at || "").slice(0, 10);
            return due === key;
          });
          return (
            <div
              key={key}
              className="min-h-24 border border-brand-ink/10 bg-surface-elevated p-2"
            >
              <p className="font-sans text-[0.65rem] font-bold uppercase text-brand-muted">
                {key.slice(5)}
              </p>
              {items.map((item) => (
                <p
                  key={item.id}
                  className="mt-1 truncate font-sans text-xs text-brand-ink"
                  title={item.title}
                >
                  {item.cluster ? `${item.cluster}: ` : ""}
                  {item.title}
                </p>
              ))}
            </div>
          );
        })}
      </div>
      <p className="font-sans text-xs text-brand-muted">
        Clusters: {POST_CLUSTERS.map((c) => c.label).join(", ")}
      </p>
    </div>
  );
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
