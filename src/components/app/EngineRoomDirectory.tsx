"use client";

import Link from "next/link";

export type EngineRoomMember = {
  id: string;
  username: string | null;
  display_name: string | null;
  following: boolean;
  public_opt_in?: boolean;
};

const secondaryBtn =
  "inline-flex min-h-10 items-center justify-center border border-brand-ink/15 px-3 py-2 font-sans text-xs font-bold uppercase tracking-[0.08em] text-brand-ink hover:border-brand-orange hover:text-brand-orange disabled:opacity-60";

export default function EngineRoomDirectory({
  members,
  pending,
  onFollow,
  onUnfollow,
}: {
  members: EngineRoomMember[];
  pending: boolean;
  onFollow: (member: EngineRoomMember) => void;
  onUnfollow: (member: EngineRoomMember) => void;
}) {
  if (members.length === 0) {
    return (
      <p className="mt-2 font-sans text-sm text-brand-muted">
        No other members have a username yet. When they do, they will show up
        here so you can follow them without typing a handle.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-brand-ink/10 border border-brand-ink/10">
      {members.map((member) => {
        const handle = member.username ? `@${member.username}` : "Member";
        const name = member.display_name || handle;
        return (
          <li
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-2 px-3 py-2"
          >
            <div className="min-w-0">
              {member.username ? (
                <Link
                  href={`/app/engine-room/u/${member.username}`}
                  className="font-sans text-sm font-semibold text-brand-ink hover:text-brand-orange"
                >
                  {name}
                </Link>
              ) : (
                <p className="font-sans text-sm font-semibold text-brand-ink">
                  {name}
                </p>
              )}
              <p className="font-sans text-xs text-brand-muted">
                {handle}
                {member.public_opt_in ? " · public posts" : ""}
              </p>
            </div>
            <button
              type="button"
              className={secondaryBtn}
              disabled={pending || !member.username}
              onClick={() =>
                member.following ? onUnfollow(member) : onFollow(member)
              }
            >
              {member.following ? "Following" : "Follow"}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
