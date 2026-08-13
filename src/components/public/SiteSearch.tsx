"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SiteSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Squat, TDEE, first gym…"
        className="w-full border border-brand-ink/15 px-4 py-3 font-sans text-sm"
        name="q"
      />
      <button
        type="submit"
        className="bg-brand-orange px-5 py-3 font-sans text-xs font-bold uppercase tracking-[0.08em] text-white"
      >
        Search
      </button>
    </form>
  );
}
