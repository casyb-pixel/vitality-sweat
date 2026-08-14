import type { WorkoutMilestone } from "@/lib/fitness/milestones";

export async function postWinToEngineRoom(
  milestone: WorkoutMilestone,
): Promise<{ ok: boolean; error?: string }> {
  const form = new FormData();
  form.set("kind", "win");
  form.set("body", `${milestone.title}. ${milestone.detail}`);
  form.set(
    "milestone",
    JSON.stringify({
      title: milestone.title,
      detail: milestone.detail,
      type: milestone.type,
    }),
  );
  try {
    const res = await fetch("/api/app/engine-room", {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, error: json.error ?? "Could not post to The Engine Room." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not post to The Engine Room." };
  }
}
