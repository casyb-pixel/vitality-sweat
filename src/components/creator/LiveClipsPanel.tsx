"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toYouTubeEmbedSrc } from "@/lib/blog/video-embeds";
import {
  formatSecondsToClock,
  parseClockToSeconds,
  parseYouTubeVideoId,
} from "@/lib/video/youtube-clips";

type LiveClip = {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  source_url: string | null;
  start_sec: number | null;
  end_sec: number | null;
  category: string;
  gym_name: string | null;
  exercise_id: string | null;
  published_at: string | null;
  created_at: string;
};

type ExerciseOption = { id: string; name: string };

const fieldClass =
  "mt-1 w-full border border-brand-ink/15 bg-surface px-3 py-2.5 font-sans text-sm text-brand-ink outline-none focus:border-brand-orange";

export default function LiveClipsPanel() {
  const [clips, setClips] = useState<LiveClip[]>([]);
  const [exercises, setExercises] = useState<ExerciseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [sourceUrl, setSourceUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("");
  const [gymName, setGymName] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [attachHowto, setAttachHowto] = useState(false);
  const [category, setCategory] = useState("training");

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/creator/live-clips");
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        clips?: LiveClip[];
        exercises?: ExerciseOption[];
      };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not load live clips.");
        return;
      }
      setClips(json.clips ?? []);
      setExercises(json.exercises ?? []);
    } catch {
      setError("Could not load live clips.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const startSec = parseClockToSeconds(start);
  const endSec = end.trim() ? parseClockToSeconds(end) : null;
  const previewSrc = useMemo(() => {
    if (!parseYouTubeVideoId(sourceUrl)) return null;
    if (startSec == null) return null;
    return toYouTubeEmbedSrc(sourceUrl, {
      autoplay: false,
      startSec,
      endSec,
    });
  }, [sourceUrl, startSec, endSec]);

  async function publish() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/creator/live-clips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_url: sourceUrl,
          title,
          description,
          start,
          end,
          category,
          gym_name: gymName,
          exercise_id: exerciseId || null,
          attach_howto: attachHowto,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not publish this clip.");
        return;
      }
      setMessage("Clip is in the Library. Cut another slice from the same live.");
      setTitle("");
      setDescription("");
      setStart("0:00");
      setEnd("");
      setAttachHowto(false);
      await load();
    } catch {
      setError("Could not publish this clip.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4 border border-brand-ink/10 bg-surface-elevated p-4 sm:p-5">
        <div>
          <h2 className="font-display text-2xl text-brand-ink">
            Cut a live into training clips
          </h2>
          <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-brand-muted">
            After Hunter gym lives are saved on YouTube, paste the video URL and
            mark start and end times (1:23). Each slice publishes to the Library
            as a YouTube embed. We do not download or re-upload the file.
          </p>
        </div>

        <label className="block">
          <span className="font-sans text-sm font-semibold text-brand-ink">
            YouTube live or VOD URL
          </span>
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://www.youtube.com/live/… or /watch?v="
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="font-sans text-sm font-semibold text-brand-ink">
            Clip title
          </span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Barbell row cues from Red's"
            className={fieldClass}
          />
        </label>

        <label className="block">
          <span className="font-sans text-sm font-semibold text-brand-ink">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={fieldClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-sans text-sm font-semibold text-brand-ink">
              Start
            </span>
            <input
              value={start}
              onChange={(e) => setStart(e.target.value)}
              placeholder="1:23"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="font-sans text-sm font-semibold text-brand-ink">
              End (optional)
            </span>
            <input
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              placeholder="2:10"
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="font-sans text-sm font-semibold text-brand-ink">
              Gym name
            </span>
            <input
              value={gymName}
              onChange={(e) => setGymName(e.target.value)}
              placeholder="Optional, typed, no GPS"
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="font-sans text-sm font-semibold text-brand-ink">
              Category
            </span>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={fieldClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="font-sans text-sm font-semibold text-brand-ink">
            Attach as exercise how-to
          </span>
          <select
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            className={fieldClass}
          >
            <option value="">Leave off the exercise library</option>
            {exercises.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-start gap-2 font-sans text-sm text-brand-ink">
          <input
            type="checkbox"
            checked={attachHowto}
            onChange={(e) => setAttachHowto(e.target.checked)}
            disabled={!exerciseId}
            className="mt-0.5"
          />
          <span>
            Also set this slice as the how-to video on the selected exercise.
          </span>
        </label>

        {previewSrc ? (
          <div className="aspect-video w-full overflow-hidden bg-brand-ink/5">
            <iframe
              title="Clip preview"
              src={previewSrc}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : null}

        {error ? (
          <p className="font-sans text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="font-sans text-sm text-brand-ink">{message}</p>
        ) : null}

        <button
          type="button"
          onClick={() => void publish()}
          disabled={busy}
          className="inline-flex min-h-12 w-full items-center justify-center bg-brand-orange px-5 py-3 font-sans text-sm font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Publishing…" : "Publish to Library"}
        </button>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-xl text-brand-ink">Published slices</h3>
        {loading ? (
          <p className="font-sans text-sm text-brand-muted">Loading clips…</p>
        ) : clips.length === 0 ? (
          <p className="font-sans text-sm text-brand-muted">
            No live slices yet. Publish the first one above.
          </p>
        ) : (
          <ul className="space-y-3">
            {clips.map((clip) => (
              <li
                key={clip.id}
                className="border border-brand-ink/10 bg-surface-elevated p-4"
              >
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {clip.title}
                </p>
                <p className="mt-1 font-sans text-xs text-brand-muted">
                  {formatSecondsToClock(clip.start_sec ?? 0)}
                  {clip.end_sec != null
                    ? ` to ${formatSecondsToClock(clip.end_sec)}`
                    : " to end"}
                  {clip.gym_name ? ` · ${clip.gym_name}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
