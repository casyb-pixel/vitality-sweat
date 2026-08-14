"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

type EngineRoomProfileClientProps = {
  username: string;
};

export default function EngineRoomProfileClient({
  username,
}: EngineRoomProfileClientProps) {
  const [displayName, setDisplayName] = useState(username);
  const [following, setFollowing] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [posts, setPosts] = useState<{ id: string; body: string; created_at: string }[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/app/engine-room/profile?username=${encodeURIComponent(username)}`,
    );
    const json = (await res.json()) as {
      ok?: boolean;
      error?: string;
      profile?: {
        id: string;
        display_name: string | null;
        username: string | null;
        following: boolean;
        isSelf: boolean;
      };
      posts?: { id: string; body: string; created_at: string }[];
    };
    if (!res.ok || !json.ok || !json.profile) {
      setError(json.error ?? "Could not load profile.");
      return;
    }
    setDisplayName(json.profile.display_name || json.profile.username || username);
    setFollowing(json.profile.following);
    setIsSelf(json.profile.isSelf);
    setUserId(json.profile.id);
    setPosts(json.posts ?? []);
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFollow() {
    setPending(true);
    try {
      if (following && userId) {
        await fetch(
          `/api/app/follows?following_id=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        );
      } else {
        await fetch("/api/app/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
      }
      await load();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-sans text-sm">
        <Link href="/app/engine-room" className="text-brand-orange">
          Back to The Engine Room
        </Link>
      </p>
      <header>
        <p className="eyebrow text-brand-orange">@{username}</p>
        <h1 className="font-display text-3xl text-brand-ink">{displayName}</h1>
      </header>
      {error ? <p className="font-sans text-sm text-red-700">{error}</p> : null}
      {!isSelf ? (
        <button
          type="button"
          className={following ? secondaryBtn : primaryBtn}
          disabled={pending}
          onClick={() => void toggleFollow()}
        >
          {following ? "Unfollow" : "Follow"}
        </button>
      ) : null}
      {posts.length === 0 ? (
        <p className="font-sans text-sm text-brand-muted">No posts yet.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li key={post.id} className="border border-brand-ink/10 p-4">
              <p className="font-sans text-xs text-brand-muted">
                {new Date(post.created_at).toLocaleString()}
              </p>
              <p className="mt-1 font-sans text-sm text-brand-ink">{post.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
