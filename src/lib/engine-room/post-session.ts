import type { PersonalLiftRank } from "@/lib/engine-room/ranks";

export async function postSessionToEngineRoom(input: {
  sessionId: string;
  visibility?: "followers" | "public";
}): Promise<{
  ok: boolean;
  alreadyPosted?: boolean;
  ranks?: PersonalLiftRank[];
  streakCount?: number;
  error?: string;
}> {
  const form = new FormData();
  form.set("kind", "session");
  form.set("session_id", input.sessionId);
  if (input.visibility) form.set("visibility", input.visibility);
  try {
    const res = await fetch("/api/app/engine-room", {
      method: "POST",
      body: form,
    });
    const json = (await res.json()) as {
      ok?: boolean;
      alreadyPosted?: boolean;
      ranks?: PersonalLiftRank[];
      streakCount?: number;
      error?: string;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        error: json.error ?? "Could not post this session to The Engine Room.",
      };
    }
    return {
      ok: true,
      alreadyPosted: Boolean(json.alreadyPosted),
      ranks: json.ranks ?? [],
      streakCount: json.streakCount,
    };
  } catch {
    return { ok: false, error: "Could not post this session to The Engine Room." };
  }
}
