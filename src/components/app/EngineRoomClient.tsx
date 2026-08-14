"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ShareEngineCard from "@/components/app/ShareEngineCard";

type RoomPost = {
  id: string;
  author_id: string;
  kind: string;
  body: string;
  image_url: string | null;
  milestone_payload: { title?: string; detail?: string } | null;
  created_at: string;
  author: { display_name: string | null; username: string | null };
  reactions: { user_id: string; kind: string }[];
  comments: {
    id: string;
    body: string;
    author: { display_name: string | null; username: string | null } | null;
  }[];
};

const RULES_KEY = "vs_engine_room_rules_v1";

const primaryBtn =
  "inline-flex min-h-10 items-center justify-center bg-brand-orange px-4 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white hover:bg-brand-orange-deep disabled:opacity-60";
const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

export default function EngineRoomClient() {
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoConfirm, setPhotoConfirm] = useState(false);
  const [followName, setFollowName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/app/engine-room");
    const json = (await res.json()) as {
      ok?: boolean;
      posts?: RoomPost[];
      me?: { id?: string; username?: string | null };
      error?: string;
    };
    if (!res.ok || !json.ok) {
      setError(json.error ?? "Could not load The Engine Room.");
      return;
    }
    setPosts(json.posts ?? []);
    setUsername(json.me?.username ?? null);
    setMeId(json.me?.id ?? null);
  }, []);

  useEffect(() => {
    try {
      setAccepted(window.localStorage.getItem(RULES_KEY) === "1");
    } catch {
      setAccepted(false);
    }
    void load();
  }, [load]);

  function acceptRules() {
    try {
      window.localStorage.setItem(RULES_KEY, "1");
    } catch {
      // ignore
    }
    setAccepted(true);
  }

  async function publish(kind: "text" | "photo" | "promo" | "win") {
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("kind", kind);
      form.set("body", body);
      if (photo) form.set("photo", photo);
      if (photoConfirm) form.set("photo_confirm", "1");
      const res = await fetch("/api/app/engine-room", {
        method: "POST",
        body: form,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not post.");
        return;
      }
      setBody("");
      setPhoto(null);
      setPhotoConfirm(false);
      await load();
    } finally {
      setPending(false);
    }
  }

  async function react(postId: string, kind: "fire" | "spot" | "lets_go") {
    await fetch("/api/app/engine-room/engage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, kind }),
    });
    await load();
  }

  async function comment(postId: string, text: string) {
    if (!text.trim()) return;
    await fetch("/api/app/engine-room/engage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: postId, body: text }),
    });
    await load();
  }

  async function follow() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/app/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: followName }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Could not follow.");
        return;
      }
      setFollowName("");
      await load();
    } finally {
      setPending(false);
    }
  }

  async function report(postId: string) {
    await fetch("/api/app/engine-room/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", post_id: postId, reason: "other" }),
    });
  }

  async function block(userId: string) {
    await fetch("/api/app/engine-room/safety", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "block", user_id: userId }),
    });
    await load();
  }

  if (!accepted) {
    return (
      <section className="border border-brand-orange/30 bg-brand-orange/5 p-5">
        <p className="eyebrow text-brand-orange">House rules</p>
        <h2 className="mt-2 font-display text-2xl text-brand-ink">
          The Engine Room
        </h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-sans text-sm text-brand-ink">
          <li>Followers only. Not a public feed.</li>
          <li>No harassment. Report or block if you need to.</li>
          <li>No minors in photos. Confirm 18+ before posting a selfie.</li>
          <li>Celebrate the work. Keep medical claims out of it.</li>
        </ul>
        <p className="mt-3 font-sans text-sm leading-relaxed text-brand-muted">
          These rules are part of the Terms you accepted. Read the{" "}
          <Link href="/community-guidelines" className="font-semibold text-brand-orange">
            Community Guidelines
          </Link>{" "}
          and{" "}
          <Link href="/terms" className="font-semibold text-brand-orange">
            Terms of Use
          </Link>
          .
        </p>
        <button type="button" className={`${primaryBtn} mt-4`} onClick={acceptRules}>
          I agree. Open The Engine Room
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <p className="font-sans text-sm text-brand-muted">
          Follow a teammate to see their posts. Find them at the rack, scan Train
          together, or add @username here.
        </p>
        {!username ? (
          <p className="mt-2 font-sans text-sm text-brand-ink">
            Set a username in{" "}
            <Link href="/app/settings" className="font-semibold text-brand-orange">
              Settings
            </Link>{" "}
            before you post.
          </p>
        ) : (
          <p className="mt-2 font-sans text-sm text-brand-ink">
            You are @{username}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            value={followName}
            onChange={(e) => setFollowName(e.target.value)}
            placeholder="@username"
            className="min-h-10 flex-1 border border-brand-ink/15 px-3 py-2 font-sans text-sm"
          />
          <button
            type="button"
            className={primaryBtn}
            disabled={pending || !followName.trim()}
            onClick={() => void follow()}
          >
            Follow
          </button>
        </div>
      </section>

      <section className="border border-brand-ink/10 bg-surface-elevated p-5">
        <h2 className="font-display text-xl text-brand-ink">Post</h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="Encouragement, a win, or a gym-floor note."
          className="mt-3 w-full border border-brand-ink/15 px-3 py-2 font-sans text-sm"
        />
        <input
          type="file"
          accept="image/*"
          capture="user"
          className="mt-3 block w-full font-sans text-sm"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
        {photo ? (
          <label className="mt-2 flex items-start gap-2 font-sans text-sm text-brand-ink">
            <input
              type="checkbox"
              checked={photoConfirm}
              onChange={(e) => setPhotoConfirm(e.target.checked)}
            />
            I am 18+ and no minors are in this photo.
          </label>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className={primaryBtn}
            disabled={pending}
            onClick={() => void publish(photo ? "photo" : "text")}
          >
            {pending ? "Posting…" : "Post"}
          </button>
          <button
            type="button"
            className={secondaryBtn}
            onClick={() => setShowPromo((v) => !v)}
          >
            Promote the Engine
          </button>
        </div>
      </section>

      {showPromo ? <ShareEngineCard /> : null}

      {error ? (
        <p className="font-sans text-sm text-red-700">{error}</p>
      ) : null}

      {posts.length === 0 ? (
        <p className="font-sans text-sm text-brand-muted">
          No posts yet. Follow a teammate, then their posts land here.
        </p>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <li
              key={post.id}
              className="border border-brand-ink/10 bg-surface-elevated p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    href={
                      post.author.username
                        ? `/app/engine-room/u/${post.author.username}`
                        : "/app/engine-room"
                    }
                    className="font-sans text-sm font-semibold text-brand-ink hover:text-brand-orange"
                  >
                    {post.author.display_name ||
                      (post.author.username ? `@${post.author.username}` : "Member")}
                  </Link>
                  <p className="font-sans text-xs text-brand-muted">
                    {new Date(post.created_at).toLocaleString()}
                  </p>
                </div>
                {post.author_id !== meId ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={secondaryBtn}
                      onClick={() => void report(post.id)}
                    >
                      Report
                    </button>
                    <button
                      type="button"
                      className={secondaryBtn}
                      onClick={() => void block(post.author_id)}
                    >
                      Block
                    </button>
                  </div>
                ) : null}
              </div>
              {post.body ? (
                <p className="mt-3 whitespace-pre-wrap font-sans text-sm text-brand-ink">
                  {post.body}
                </p>
              ) : null}
              {post.milestone_payload?.title ? (
                <p className="mt-2 font-sans text-sm font-semibold text-brand-orange">
                  {post.milestone_payload.title}
                </p>
              ) : null}
              {post.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.image_url}
                  alt=""
                  className="mt-3 max-h-80 w-full object-cover"
                />
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => void react(post.id, "fire")}
                >
                  Fire{" "}
                  {post.reactions.filter((r) => r.kind === "fire").length || ""}
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => void react(post.id, "spot")}
                >
                  Spot{" "}
                  {post.reactions.filter((r) => r.kind === "spot").length || ""}
                </button>
                <button
                  type="button"
                  className={secondaryBtn}
                  onClick={() => void react(post.id, "lets_go")}
                >
                  Let&apos;s go{" "}
                  {post.reactions.filter((r) => r.kind === "lets_go").length ||
                    ""}
                </button>
              </div>
              <ul className="mt-3 space-y-1">
                {post.comments.map((c) => (
                  <li key={c.id} className="font-sans text-sm text-brand-muted">
                    <span className="font-semibold text-brand-ink">
                      {c.author?.display_name ||
                        (c.author?.username ? `@${c.author.username}` : "Member")}
                    </span>{" "}
                    {c.body}
                  </li>
                ))}
              </ul>
              <CommentBox
                onSubmit={(text) => void comment(post.id, text)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentBox({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="mt-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(text);
        setText("");
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Encourage them"
        className="min-h-10 flex-1 border border-brand-ink/15 px-3 py-2 font-sans text-sm"
      />
      <button type="submit" className={secondaryBtn} disabled={!text.trim()}>
        Reply
      </button>
    </form>
  );
}
